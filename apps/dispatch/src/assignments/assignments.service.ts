import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  DOMAIN_EVENTS,
  NATS_PATTERNS,
  STAFF_ROLES,
  type AssignDriverDto,
  type AssignmentDto,
  type AssignmentStatusLabel,
  type AssignmentTypeLabel,
  type BookingConfirmedEventDto,
  type BookingDto,
  type BookingStatusChangedEventDto,
  type ChauffeurDurationLabel,
  type DispatchAssignedEventDto,
  type DispatchTripCompletedEventDto,
  type DispatchTripStatusEventDto,
  type LocaleLabel,
  type PublicUserDto,
  type UpdateTripStatusDto,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout, defaultIfEmpty } from 'rxjs';
import type {
  Assignment,
  AssignmentStatus,
  AssignmentType,
  ChauffeurDuration,
  Driver,
} from '../../generated/prisma';
import { assertAssignmentTypePayload } from '../assignment-type.payload';
import { DISPATCH_NATS } from '../dispatch.constants';
import { PrismaService } from '../prisma.service';
import { canTripTransition } from './assignment-status.machine';

const DURATION_TO_PRISMA: Record<ChauffeurDurationLabel, ChauffeurDuration> = {
  hourly: 'hourly',
  'half-day': 'half_day',
  'full-day': 'full_day',
};

const DURATION_TO_LABEL: Record<ChauffeurDuration, ChauffeurDurationLabel> = {
  hourly: 'hourly',
  half_day: 'half-day',
  full_day: 'full-day',
};

/** Statuses that may receive (or change) a driver assignment. */
const ASSIGNABLE_STATUSES = new Set(['pending', 'assigned']);

type CustomerSnapshot = {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  locale?: LocaleLabel;
};

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DISPATCH_NATS) private readonly nats: ClientProxy,
  ) {}

  /**
   * Idempotent consumer for booking.confirmed.
   * Creates a pending Assignment for transfer|chauffeur; copies flightNumber for transfer.
   */
  async onBookingConfirmed(event: BookingConfirmedEventDto): Promise<void> {
    try {
      await this.ensureFromBooking(event.booking);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create assignment for booking.confirmed ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cancel pending/assigned jobs when booking is cancelled (best-effort).
   */
  async onBookingCancelled(event: BookingStatusChangedEventDto): Promise<void> {
    try {
      const existing = await this.prisma.assignment.findUnique({
        where: { bookingId: event.booking.id },
      });
      if (!existing) return;
      if (existing.status === 'cancelled' || existing.status === 'completed') {
        return;
      }
      await this.prisma.assignment.update({
        where: { id: existing.id },
        data: { status: 'cancelled' },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to cancel assignment for booking.cancelled ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Ensure a pending Assignment exists for a transfer/chauffeur booking.
   * Stores flightNumber from booking (quote snapshot) when type=transfer.
   */
  async ensureFromBooking(booking: BookingDto): Promise<AssignmentDto | null> {
    if (booking.type !== 'transfer' && booking.type !== 'chauffeur') {
      return null;
    }

    const type = booking.type as AssignmentTypeLabel;
    const { flightNumber, duration } = assertAssignmentTypePayload({
      type,
      flightNumber: booking.flightNumber,
      duration: booking.duration,
    });

    const existing = await this.prisma.assignment.findUnique({
      where: { bookingId: booking.id },
    });
    if (existing) {
      // Backfill flightNumber if confirm replayed after quote had the number.
      if (
        type === 'transfer' &&
        flightNumber &&
        existing.flightNumber !== flightNumber
      ) {
        const updated = await this.prisma.assignment.update({
          where: { id: existing.id },
          data: { flightNumber },
        });
        return toAssignmentDto(updated);
      }
      return toAssignmentDto(existing);
    }

    const created = await this.prisma.assignment.create({
      data: {
        bookingId: booking.id,
        type: type as AssignmentType,
        flightNumber,
        duration: duration ? DURATION_TO_PRISMA[duration] : null,
        status: 'pending',
        scheduledAt: new Date(booking.startAt),
      },
    });

    this.logger.log(
      `Assignment ${created.id} created for booking ${booking.id} type=${type}` +
        (flightNumber ? ` flight=${flightNumber}` : ''),
    );

    return toAssignmentDto(created);
  }

  /**
   * Ops assigns a driver to a booking's Assignment (NATS `dispatch.assign` / G4).
   * Sets status=assigned, writes outbox, emits `dispatch.assigned` for notify.
   */
  async assign(dto: AssignDriverDto): Promise<{ data: AssignmentDto }> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (!assignment) {
      throw new RpcException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: `No assignment for booking ${dto.bookingId}`,
        status: 404,
      });
    }

    if (!ASSIGNABLE_STATUSES.has(assignment.status)) {
      throw new RpcException({
        code: 'ASSIGNMENT_NOT_ASSIGNABLE',
        message: `Cannot assign driver when assignment status is ${assignment.status}`,
        status: 409,
        details: [{ status: assignment.status }],
      });
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });
    if (!driver) {
      throw new RpcException({
        code: 'DRIVER_NOT_FOUND',
        message: `Driver ${dto.driverId} not found`,
        status: 404,
      });
    }
    if (driver.status === 'inactive') {
      throw new RpcException({
        code: 'DRIVER_INACTIVE',
        message: 'Cannot assign an inactive driver',
        status: 409,
        details: [{ driverId: driver.id, status: driver.status }],
      });
    }

    const customer = await this.lookupCustomerForBooking(assignment.bookingId);
    const eventId = randomUUID();
    const occurredAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          driverId: driver.id,
          status: 'assigned',
        },
      });

      const eventPayload: DispatchAssignedEventDto = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        assignmentId: next.id,
        bookingId: next.bookingId,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        ...customer,
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName: DOMAIN_EVENTS.dispatchAssigned,
          payload: eventPayload as object,
        },
      });

      return { next, eventPayload };
    });

    await this.publishOutbox(
      DOMAIN_EVENTS.dispatchAssigned,
      updated.eventPayload,
    );

    this.logger.log(
      `Assignment ${updated.next.id} assigned driver=${driver.id} booking=${dto.bookingId}`,
    );

    return { data: toAssignmentDto(updated.next) };
  }

  /**
   * Driver/ops trip progress (NATS `dispatch.trip.status` / G5).
   * Emits `dispatch.trip.status.changed` for notify; on completed also
   * `dispatch.trip.completed` so booking can start/complete as appropriate.
   */
  async updateTripStatus(
    dto: UpdateTripStatusDto,
  ): Promise<{ data: AssignmentDto }> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignmentId },
      include: { driver: true },
    });
    if (!assignment) {
      throw new RpcException({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: `Assignment ${dto.assignmentId} not found`,
        status: 404,
      });
    }

    this.assertTripActor(dto, assignment.driver);

    const target = dto.status as AssignmentStatus;
    if (assignment.status === target) {
      return { data: toAssignmentDto(assignment) };
    }

    if (!canTripTransition(assignment.status, target)) {
      throw new RpcException({
        code: 'ILLEGAL_TRANSITION',
        message: `Cannot transition assignment from ${assignment.status} to ${target}`,
        status: 409,
        details: [{ from: assignment.status, to: target }],
      });
    }

    if (!assignment.driverId) {
      throw new RpcException({
        code: 'ASSIGNMENT_NO_DRIVER',
        message: 'Assignment has no driver; assign a driver first',
        status: 409,
      });
    }

    const customer = await this.lookupCustomerForBooking(assignment.bookingId);
    const fromStatus = assignment.status as AssignmentStatusLabel;
    const statusEventId = randomUUID();
    const completedEventId = target === 'completed' ? randomUUID() : null;
    const occurredAt = new Date();
    const correlationId = dto.correlationId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.assignment.update({
        where: { id: assignment.id },
        data: { status: target },
      });

      if (assignment.driverId) {
        const driverStatus =
          target === 'completed' ? 'available' : 'on_trip';
        await tx.driver.update({
          where: { id: assignment.driverId },
          data: { status: driverStatus },
        });
      }

      const statusEvent: DispatchTripStatusEventDto = {
        eventId: statusEventId,
        occurredAt: occurredAt.toISOString(),
        correlationId,
        assignmentId: next.id,
        bookingId: next.bookingId,
        driverId: next.driverId ?? undefined,
        status: dto.status,
        fromStatus,
        ...customer,
      };

      await tx.outboxEvent.create({
        data: {
          id: statusEventId,
          eventName: DOMAIN_EVENTS.dispatchTripStatus,
          payload: statusEvent as object,
        },
      });

      let completedEvent: DispatchTripCompletedEventDto | null = null;
      if (completedEventId) {
        completedEvent = {
          eventId: completedEventId,
          occurredAt: occurredAt.toISOString(),
          correlationId,
          assignmentId: next.id,
          bookingId: next.bookingId,
          driverId: next.driverId ?? undefined,
        };
        await tx.outboxEvent.create({
          data: {
            id: completedEventId,
            eventName: DOMAIN_EVENTS.dispatchTripCompleted,
            payload: completedEvent as object,
          },
        });
      }

      return { next, statusEvent, completedEvent };
    });

    await this.publishOutbox(
      DOMAIN_EVENTS.dispatchTripStatus,
      updated.statusEvent,
    );
    if (updated.completedEvent) {
      await this.publishOutbox(
        DOMAIN_EVENTS.dispatchTripCompleted,
        updated.completedEvent,
      );
    }

    this.logger.log(
      `Assignment ${updated.next.id} ${fromStatus} → ${target} booking=${updated.next.bookingId}`,
    );

    return { data: toAssignmentDto(updated.next) };
  }

  private assertTripActor(
    dto: UpdateTripStatusDto,
    driver: Driver | null,
  ): void {
    const isStaff = (STAFF_ROLES as readonly string[]).includes(dto.actorRole);
    if (isStaff) return;

    if (dto.actorRole !== 'driver') {
      throw new RpcException({
        code: 'FORBIDDEN',
        message: 'Only driver, ops_agent, or admin may update trip status',
        status: 403,
      });
    }

    if (!driver?.userId || driver.userId !== dto.actorUserId) {
      throw new RpcException({
        code: 'FORBIDDEN',
        message: 'Driver may only update their own assignment',
        status: 403,
      });
    }
  }

  private async lookupCustomerForBooking(
    bookingId: string,
  ): Promise<CustomerSnapshot> {
    try {
      const bookingRes = await firstValueFrom(
        this.nats
          .send<{ data: BookingDto }>(NATS_PATTERNS.booking.get, { bookingId })
          .pipe(timeout(3000)),
      );
      const booking = bookingRes?.data;
      if (!booking?.customerId) return {};

      const customer = await this.lookupCustomer(booking.customerId);
      if (!customer) {
        return { customerId: booking.customerId };
      }

      return {
        customerId: booking.customerId,
        ...(customer.name ? { customerName: customer.name } : {}),
        ...(customer.phone ? { customerPhone: customer.phone } : {}),
        ...(customer.email ? { customerEmail: customer.email } : {}),
        ...(customer.locale === 'en' || customer.locale === 'fr'
          ? { locale: customer.locale }
          : {}),
      };
    } catch (error: unknown) {
      this.logger.warn(
        `customer lookup failed for booking ${bookingId}; notify may skip contact`,
        error instanceof Error ? error.message : String(error),
      );
      return {};
    }
  }

  private async lookupCustomer(
    customerId: string,
  ): Promise<PublicUserDto | null> {
    try {
      return await firstValueFrom(
        this.nats
          .send<PublicUserDto>(NATS_PATTERNS.identity.me, { userId: customerId })
          .pipe(timeout(3000)),
      );
    } catch (error: unknown) {
      this.logger.warn(
        `identity.me failed for customerId=${customerId}`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private async publishOutbox(
    eventName: string,
    event: { eventId: string },
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.nats.emit(eventName, event).pipe(timeout(5000), defaultIfEmpty(null)),
      );
      await this.prisma.outboxEvent.update({
        where: { id: event.eventId },
        data: { publishedAt: new Date() },
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to publish ${eventName} ${event.eventId}; left in outbox`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function toAssignmentDto(row: Assignment): AssignmentDto {
  return {
    id: row.id,
    bookingId: row.bookingId,
    driverId: row.driverId ?? undefined,
    type: row.type as AssignmentTypeLabel,
    flightNumber: row.flightNumber ?? undefined,
    duration: row.duration ? DURATION_TO_LABEL[row.duration] : undefined,
    status: row.status as AssignmentStatusLabel,
    scheduledAt: row.scheduledAt.toISOString(),
  };
}
