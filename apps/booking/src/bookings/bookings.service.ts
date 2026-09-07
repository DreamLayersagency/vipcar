import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  BookingConfirmedEventDto,
  BookingDto,
  BookingStatusChangedEventDto,
  CancelBookingDto,
  ConfirmBookingDto,
  DOMAIN_EVENTS,
  GetBookingDto,
  type AssignReservationUnitDto,
  type GetReservationDto,
  type ListReservationsDto,
  ListMyBookingsDto,
  NATS_PATTERNS,
  type ReservationDto,
  type ReservationStatusLabel,
  STAFF_ROLES,
  UpdateBookingStatusDto,
  type BookingStatusLabel,
  type CalendarBlockDto,
  type ChauffeurDurationLabel,
  type DispatchTripCompletedEventDto,
  type LegalPageDto,
  type PaginationMetaDto,
  type PaymentCapturedEventDto,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import { catchError, defaultIfEmpty, firstValueFrom, throwError, timeout } from 'rxjs';
import { Prisma } from '../../generated/prisma';
import type {
  Booking,
  BookingStatus,
  ChauffeurDuration,
  Quote,
  QuoteStatus,
} from '../../generated/prisma';
import { BOOKING_NATS } from '../booking.constants';
import { PrismaService } from '../prisma.service';
import { toQuoteDto } from '../quotes/quotes.service';
import { assertServiceTypePayload } from '../service-type.payload';
import { canTransition } from './booking-status.machine';
import {
  checkCancellationWindow,
  STUB_CANCELLATION_TIMING,
  type CancellationWindowCheck,
} from './cancellation-timing';

const CANCELLATION_POLICY_SLUG = 'cancellation-policy';

const DURATION_TO_LABEL: Record<ChauffeurDuration, ChauffeurDurationLabel> = {
  hourly: 'hourly',
  half_day: 'half-day',
  full_day: 'full-day',
};

const STUB_CANCELLATION_POLICY: Record<string, unknown> = {
  slug: CANCELLATION_POLICY_SLUG,
  source: 'stub',
  titleEn: 'Cancellation policy',
  bodyEn:
    'Cancellation and amendment terms depend on the service, vehicle and timing of the request and are confirmed before booking.',
  titleFr: "Politique d'annulation",
  bodyFr:
    'Les conditions d’annulation et de modification dépendent du service, du véhicule et du délai de la demande et sont confirmées avant la réservation.',
  timingRules: STUB_CANCELLATION_TIMING,
};

type QuoteWithBooking = Prisma.QuoteGetPayload<{
  include: { booking: true };
}>;

const PRE_CONFIRM_BOOKING_STATUSES = new Set<BookingStatus>([
  'quote_requested',
  'quoted',
  'awaiting_payment',
]);

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOOKING_NATS) private readonly nats: ClientProxy,
  ) {}

  /** NATS `booking.get` — load by id. */
  async get(dto: GetBookingDto): Promise<{ data: BookingDto }> {
    const booking = await this.requireBooking(dto.bookingId);
    return { data: toBookingDto(booking) };
  }

  /**
   * NATS `booking.list` — paginated bookings for one customerId.
   * Gateway must set customerId from JWT (never from client).
   */
  async listMine(
    dto: ListMyBookingsDto,
  ): Promise<{ data: BookingDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = { customerId: dto.customerId };

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map(toBookingDto),
      meta: { page, limit, total },
    };
  }

  /**
   * NATS `booking.ops.reservations.list` — unified staff inbox.
   * The originating quote id is the canonical reservation reference, while a
   * linked booking is included when the request has entered the booking flow.
   */
  async listOpsReservations(
    dto: ListReservationsDto = {},
  ): Promise<{ data: ReservationDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const and: Prisma.QuoteWhereInput[] = [];

    if (dto.service) and.push({ service: dto.service });
    if (dto.channel) and.push({ channel: dto.channel });

    if (dto.from || dto.to) {
      const startAt: Prisma.DateTimeFilter = {};
      if (dto.from) startAt.gte = parseReservationDate(dto.from, 'from');
      if (dto.to) startAt.lt = parseReservationDate(dto.to, 'to');
      if (startAt.gte && startAt.lt && startAt.gte >= startAt.lt) {
        throw new RpcException({
          code: 'VALIDATION_ERROR',
          message: 'from must be before to',
          status: 400,
          details: [{ field: 'from' }, { field: 'to' }],
        });
      }
      and.push({ startAt });
    }

    const search = dto.search?.trim();
    if (search) {
      const referenceSearch = search.toLowerCase().startsWith('vc-')
        ? search.slice(3).replace(/[^a-f0-9]/gi, '').slice(0, 8)
        : '';
      and.push({
        OR: [
          { id: search },
          ...(referenceSearch
            ? [{ id: { startsWith: referenceSearch } }]
            : []),
          { customerName: { contains: search } },
          { customerPhone: { contains: search } },
          { customerEmail: { contains: search } },
          { pickupLabel: { contains: search } },
          { dropoffLabel: { contains: search } },
          { flightNumber: { contains: search } },
        ],
      });
    }

    if (dto.status) and.push(reservationStatusWhere(dto.status));

    const where: Prisma.QuoteWhereInput = and.length ? { AND: and } : {};
    const [quotes, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: { booking: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes.map(toReservationDto),
      meta: { page, limit, total },
    };
  }

  /** NATS `booking.ops.reservation.get` — resolve by quote id or booking id. */
  async getOpsReservation(
    dto: GetReservationDto,
  ): Promise<{ data: ReservationDto }> {
    let quote = await this.prisma.quote.findFirst({
      where: { id: dto.reservationId },
      include: { booking: true },
    });

    if (!quote) {
      quote = await this.prisma.quote.findFirst({
        where: { booking: { is: { id: dto.reservationId } } },
        include: { booking: true },
      });
    }

    if (!quote) {
      throw new RpcException({
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found',
        status: 404,
      });
    }

    return { data: toReservationDto(quote) };
  }

  /**
   * Assign a fleet unit to an existing booking before confirmation. Calendar
   * blocking stays inside the existing confirm saga, so this action is safe
   * to use while staff is preparing a quote.
   */
  async assignReservationUnit(
    dto: AssignReservationUnitDto,
  ): Promise<{ data: ReservationDto }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: dto.quoteId },
      include: { booking: true },
    });

    if (!quote) {
      throw new RpcException({
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reservation not found',
        status: 404,
      });
    }
    if (!quote.booking) {
      throw new RpcException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Create the booking from this quote before assigning a unit',
        status: 409,
      });
    }
    if (!PRE_CONFIRM_BOOKING_STATUSES.has(quote.booking.status)) {
      throw new RpcException({
        code: 'UNIT_NOT_ASSIGNABLE',
        message: `Cannot change the fleet unit when booking status is ${quote.booking.status}`,
        status: 409,
        details: [{ status: quote.booking.status }],
      });
    }

    const booking = quote.booking.unitId === dto.unitId
      ? quote.booking
      : await this.prisma.booking.update({
          where: { id: quote.booking.id },
          data: { unitId: dto.unitId },
        });

    return { data: toReservationDto({ ...quote, booking }) };
  }

  /**
   * Consume `billing.payment.captured`: awaiting_payment → confirmed (idempotent).
   * Ensures fleet calendar block when confirming or on replay of an already-confirmed booking.
   * Never throws to NATS — failures are logged for retry/ops.
   */
  async onPaymentCaptured(event: PaymentCapturedEventDto): Promise<void> {
    try {
      const bookingId = event.payment?.bookingId;
      if (!bookingId) {
        this.logger.warn(
          `billing.payment.captured ${event.eventId}: missing payment.bookingId`,
        );
        return;
      }

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        this.logger.warn(
          `billing.payment.captured ${event.eventId}: booking ${bookingId} not found`,
        );
        return;
      }

      if (booking.status === 'confirmed') {
        await this.ensureFleetCalendarBlock(booking);
        this.logger.debug(
          `billing.payment.captured ${event.eventId}: booking ${bookingId} already confirmed (idempotent)`,
        );
        return;
      }

      if (booking.status !== 'awaiting_payment') {
        this.logger.warn(
          `billing.payment.captured ${event.eventId}: booking ${bookingId} status=${booking.status}; skip confirm`,
        );
        return;
      }

      await this.applyTransition(booking, 'confirmed', event.correlationId);
      this.logger.log(
        `billing.payment.captured ${event.eventId}: booking ${bookingId} awaiting_payment → confirmed paymentId=${event.payment.id}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to confirm booking for billing.payment.captured ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Consume `dispatch.trip.completed`:
   * confirmed → in_progress (booking.started) then completed;
   * in_progress → completed. Already completed → no-op.
   * Never throws to NATS.
   */
  async onTripCompleted(event: DispatchTripCompletedEventDto): Promise<void> {
    try {
      const bookingId = event.bookingId;
      if (!bookingId) {
        this.logger.warn(
          `dispatch.trip.completed ${event.eventId}: missing bookingId`,
        );
        return;
      }

      let booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        this.logger.warn(
          `dispatch.trip.completed ${event.eventId}: booking ${bookingId} not found`,
        );
        return;
      }

      if (booking.status === 'completed') {
        this.logger.debug(
          `dispatch.trip.completed ${event.eventId}: booking ${bookingId} already completed (idempotent)`,
        );
        return;
      }

      const correlationId = event.correlationId ?? event.eventId;

      if (booking.status === 'confirmed') {
        booking = await this.applyTransition(
          booking,
          'in_progress',
          correlationId,
        );
        this.logger.log(
          `dispatch.trip.completed ${event.eventId}: booking ${bookingId} confirmed → in_progress`,
        );
      }

      if (booking.status === 'in_progress') {
        await this.applyTransition(booking, 'completed', correlationId);
        this.logger.log(
          `dispatch.trip.completed ${event.eventId}: booking ${bookingId} in_progress → completed`,
        );
        return;
      }

      this.logger.warn(
        `dispatch.trip.completed ${event.eventId}: booking ${bookingId} status=${booking.status}; skip`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to complete booking for dispatch.trip.completed ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Confirm a booking (awaiting_payment → confirmed).
   * With quoteId only: create from quote at awaiting_payment, then confirm.
   */
  async confirm(dto: ConfirmBookingDto): Promise<{ data: BookingDto }> {
    if (!dto.bookingId && !dto.quoteId) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'bookingId or quoteId is required',
        status: 400,
      });
    }

    let booking: Booking;
    if (dto.bookingId) {
      booking = await this.requireBooking(dto.bookingId);
      if (dto.unitId || dto.priceTnd != null || dto.depositTnd != null) {
        booking = await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            ...(dto.unitId ? { unitId: dto.unitId } : {}),
            ...(dto.priceTnd != null ? { priceTnd: dto.priceTnd } : {}),
            ...(dto.depositTnd != null ? { depositTnd: dto.depositTnd } : {}),
          },
        });
      }
    } else {
      booking = await this.findOrCreateFromQuote(dto.quoteId!, {
        customerId: dto.customerId,
        unitId: dto.unitId,
        priceTnd: dto.priceTnd,
        depositTnd: dto.depositTnd,
        initialStatus: 'awaiting_payment',
      });
    }

    if (booking.status === 'confirmed') {
      return { data: toBookingDto(booking) };
    }

    const updated = await this.applyTransition(booking, 'confirmed', dto.correlationId);
    return { data: toBookingDto(updated) };
  }

  /**
   * Cancel a booking (owner or staff). Applies stub timing rules; staff may
   * override outside the window with a logged `reason`. Snapshots policy JSON,
   * emits `booking.cancelled`, and releases the fleet calendar block.
   */
  async cancel(dto: CancelBookingDto): Promise<{ data: BookingDto }> {
    const booking = await this.requireBooking(dto.bookingId);
    this.assertCancelAuthorized(booking, dto);

    if (booking.status === 'cancelled') {
      return { data: toBookingDto(booking) };
    }

    if (!canTransition(booking.status, 'cancelled')) {
      throw new RpcException({
        code: 'ILLEGAL_TRANSITION',
        message: `Cannot transition booking from ${booking.status} to cancelled`,
        status: 409,
        details: [{ from: booking.status, to: 'cancelled' }],
      });
    }

    const window = checkCancellationWindow(booking.status, booking.startAt);
    const isStaff = (STAFF_ROLES as readonly string[]).includes(dto.actorRole);
    const staffOverride = !window.withinWindow && isStaff;

    if (!window.withinWindow && !isStaff) {
      throw new RpcException({
        code: 'CANCELLATION_OUTSIDE_WINDOW',
        message: `Free cancellation closes ${window.freeCancelHoursBeforeStart}h before start; contact VIPCAR to amend`,
        status: 409,
        details: [
          {
            freeCancelHoursBeforeStart: window.freeCancelHoursBeforeStart,
            hoursUntilStart: Number(window.hoursUntilStart.toFixed(2)),
            startAt: booking.startAt.toISOString(),
            rulesSource: window.rulesSource,
          },
        ],
      });
    }

    if (staffOverride) {
      const reason = dto.reason?.trim();
      if (!reason || reason.length < 3) {
        throw new RpcException({
          code: 'VALIDATION_ERROR',
          message:
            'Staff override outside the free-cancel window requires a reason (min 3 characters)',
          status: 400,
          details: [
            {
              field: 'reason',
              freeCancelHoursBeforeStart: window.freeCancelHoursBeforeStart,
              hoursUntilStart: Number(window.hoursUntilStart.toFixed(2)),
            },
          ],
        });
      }
      this.logger.warn(
        `Staff cancel override booking=${booking.id} actor=${dto.actorUserId} role=${dto.actorRole} hoursUntilStart=${window.hoursUntilStart.toFixed(2)} reason=${reason}`,
      );
    }

    const policySnapshot = await this.loadCancellationPolicySnapshot({
      cancelledBy: dto.actorUserId,
      actorRole: dto.actorRole,
      window,
      staffOverride,
      overrideReason: staffOverride ? dto.reason!.trim() : dto.reason?.trim(),
    });
    const fromStatus = booking.status;
    const eventId = randomUUID();
    const occurredAt = new Date();
    const eventName = DOMAIN_EVENTS.bookingCancelled;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          cancellationPolicySnapshot: policySnapshot as Prisma.InputJsonValue,
        },
      });

      const bookingDto = toBookingDto(next);
      const payload = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        correlationId: dto.correlationId,
        booking: bookingDto,
        fromStatus: fromStatus as BookingStatusLabel,
        toStatus: 'cancelled' as BookingStatusLabel,
      } satisfies BookingStatusChangedEventDto;

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName,
          payload: payload as object,
        },
      });

      return next;
    });

    await this.publishOutbox(eventId, eventName, {
      eventId,
      occurredAt: occurredAt.toISOString(),
      correlationId: dto.correlationId,
      booking: toBookingDto(updated),
      fromStatus: fromStatus as BookingStatusLabel,
      toStatus: 'cancelled' as BookingStatusLabel,
    });

    // Sync release (event consumer is the durable path; this is best-effort).
    await this.releaseFleetCalendar(updated.id);

    return { data: toBookingDto(updated) };
  }

  /**
   * Apply a status transition. Illegal transitions → 409 ILLEGAL_TRANSITION.
   * With quoteId and no booking: create at quote_requested, then transition if needed.
   */
  async updateStatus(dto: UpdateBookingStatusDto): Promise<{ data: BookingDto }> {
    if (!dto.bookingId && !dto.quoteId) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'bookingId or quoteId is required',
        status: 400,
      });
    }

    let booking: Booking;
    if (dto.bookingId) {
      booking = await this.requireBooking(dto.bookingId);
    } else {
      booking = await this.findOrCreateFromQuote(dto.quoteId!, {
        customerId: dto.customerId,
        unitId: dto.unitId,
        priceTnd: dto.priceTnd,
        depositTnd: dto.depositTnd,
        initialStatus: 'quote_requested',
      });
    }

    if (dto.unitId || dto.priceTnd != null || dto.depositTnd != null) {
      booking = await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          ...(dto.unitId ? { unitId: dto.unitId } : {}),
          ...(dto.priceTnd != null ? { priceTnd: dto.priceTnd } : {}),
          ...(dto.depositTnd != null ? { depositTnd: dto.depositTnd } : {}),
        },
      });
    }

    const target = dto.status as BookingStatus;
    if (booking.status === target) {
      return { data: toBookingDto(booking) };
    }

    const updated = await this.applyTransition(booking, target, dto.correlationId);
    return { data: toBookingDto(updated) };
  }

  private async applyTransition(
    booking: Booking,
    toStatus: BookingStatus,
    correlationId?: string,
  ): Promise<Booking> {
    if (!canTransition(booking.status, toStatus)) {
      throw new RpcException({
        code: 'ILLEGAL_TRANSITION',
        message: `Cannot transition booking from ${booking.status} to ${toStatus}`,
        status: 409,
        details: [{ from: booking.status, to: toStatus }],
      });
    }

    // Saga step 1: reserve fleet calendar BEFORE confirming so we never leave
    // a confirmed booking without a CalendarBlock (or a block without confirm).
    let fleetBlocked = false;
    if (toStatus === 'confirmed') {
      await this.ensureUnitForConfirm(booking);
      await this.blockFleetCalendar(booking);
      fleetBlocked = true;
    }

    const fromStatus = booking.status;
    const eventId = randomUUID();
    const occurredAt = new Date();
    const eventName = eventNameForStatus(toStatus);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const next = await tx.booking.update({
          where: { id: booking.id },
          data: { status: toStatus },
        });

        if (toStatus === 'confirmed') {
          await tx.quote.update({
            where: { id: booking.quoteId },
            data: { status: 'converted' },
          });
        }

        if (eventName) {
          const bookingDto = toBookingDto(next);
          const payload =
            toStatus === 'confirmed'
              ? ({
                  eventId,
                  occurredAt: occurredAt.toISOString(),
                  correlationId,
                  booking: bookingDto,
                } satisfies BookingConfirmedEventDto)
              : ({
                  eventId,
                  occurredAt: occurredAt.toISOString(),
                  correlationId,
                  booking: bookingDto,
                  fromStatus: fromStatus as BookingStatusLabel,
                  toStatus: toStatus as BookingStatusLabel,
                } satisfies BookingStatusChangedEventDto);

          await tx.outboxEvent.create({
            data: {
              id: eventId,
              eventName,
              payload: payload as object,
            },
          });
        }

        return next;
      });

      if (eventName) {
        await this.publishOutbox(eventId, eventName, {
          eventId,
          occurredAt: occurredAt.toISOString(),
          correlationId,
          booking: toBookingDto(updated),
          ...(toStatus !== 'confirmed'
            ? {
                fromStatus: fromStatus as BookingStatusLabel,
                toStatus: toStatus as BookingStatusLabel,
              }
            : {}),
        });
      }

      return updated;
    } catch (error: unknown) {
      // Saga compensate: drop calendar block if confirm TX / outbox write failed.
      if (fleetBlocked) {
        await this.releaseFleetCalendar(booking.id);
      }
      throw error;
    }
  }

  private ensureUnitForConfirm(booking: Booking): void {
    if (!booking.unitId) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'unitId is required to confirm a booking (fleet calendar block)',
        status: 400,
      });
    }
  }

  /** Saga: create CalendarBlock for unitId/[startAt,endAt) before confirm commits. */
  private async blockFleetCalendar(booking: Booking): Promise<void> {
    try {
      await firstValueFrom(
        this.nats
          .send<{ data: CalendarBlockDto }>(NATS_PATTERNS.fleet.calendar.block, {
            unitId: booking.unitId!,
            bookingId: booking.id,
            startAt: booking.startAt.toISOString(),
            endAt: booking.endAt.toISOString(),
            reason: 'booking',
          })
          .pipe(
            timeout(10_000),
            catchError((err: unknown) => throwError(() => mapFleetRpcError(err))),
          ),
      );
    } catch (error: unknown) {
      if (error instanceof RpcException) throw error;
      throw mapFleetRpcError(error);
    }
  }

  /**
   * Best-effort idempotent calendar block for already-confirmed bookings
   * (payment-captured replay). Fleet also consumes booking.confirmed.
   */
  private async ensureFleetCalendarBlock(booking: Booking): Promise<void> {
    if (!booking.unitId) {
      this.logger.warn(
        `booking ${booking.id} confirmed without unitId; skip calendar block`,
      );
      return;
    }
    try {
      await this.blockFleetCalendar(booking);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to ensure fleet calendar block for booking ${booking.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Saga compensate / cancel prep: remove CalendarBlock(s) for this booking. */
  private async releaseFleetCalendar(bookingId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.nats
          .send(NATS_PATTERNS.fleet.calendar.release, { bookingId })
          .pipe(timeout(10_000), defaultIfEmpty(null)),
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to compensate fleet calendar release for booking ${bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async findOrCreateFromQuote(
    quoteId: string,
    opts: {
      customerId?: string;
      unitId?: string;
      priceTnd?: number;
      depositTnd?: number;
      initialStatus: BookingStatus;
    },
  ): Promise<Booking> {
    const existing = await this.prisma.booking.findUnique({ where: { quoteId } });
    if (existing) {
      return existing;
    }

    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) {
      throw new RpcException({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found',
        status: 404,
      });
    }

    assertServiceTypePayload({
      service: quote.service,
      endAt: quote.endAt,
      duration: quote.duration,
      flightNumber: quote.flightNumber,
    });

    const customerId = opts.customerId ?? quote.customerId;
    if (!customerId) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'customerId is required to create a booking from quote',
        status: 400,
      });
    }

    const priceTnd =
      opts.priceTnd ??
      (quote.confirmedPriceTnd != null
        ? Number(quote.confirmedPriceTnd)
        : quote.indicativePriceTnd != null
          ? Number(quote.indicativePriceTnd)
          : null);
    if (priceTnd == null) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'priceTnd is required (set confirmedPriceTnd on quote or pass in payload)',
        status: 400,
      });
    }

    // Chauffeur billing uses the ops-confirmed price when present; duration is snapshotted.
    if (quote.service === 'chauffeur' && !quote.duration) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'Chauffeur quote is missing duration (hourly | half-day | full-day)',
        status: 400,
        details: [{ field: 'duration' }],
      });
    }

    const depositTnd = opts.depositTnd ?? 0;
    const pickupLabel = quote.pickupLabel?.trim() || 'TBD';
    // Rental always has endAt (asserted above). Transfer/chauffeur may omit it.
    const endAt = quote.endAt ?? quote.startAt;
    const duration =
      quote.service === 'chauffeur' ? quote.duration : null;
    const flightNumber =
      quote.service === 'transfer'
        ? quote.flightNumber?.trim() || null
        : null;

    try {
      return await this.prisma.booking.create({
        data: {
          quoteId: quote.id,
          customerId,
          type: quote.service,
          status: opts.initialStatus,
          vehicleModelId: quote.vehicleModelId,
          unitId: opts.unitId ?? null,
          pickupLabel,
          dropoffLabel: quote.dropoffLabel,
          startAt: quote.startAt,
          endAt,
          duration,
          flightNumber,
          priceTnd,
          depositTnd,
        },
      });
    } catch {
      // Concurrent create on same quote — return the winner.
      const again = await this.prisma.booking.findUnique({ where: { quoteId } });
      if (again) return again;
      throw new RpcException({
        code: 'BOOKING_CREATE_FAILED',
        message: 'Failed to create booking from quote',
        status: 500,
      });
    }
  }

  private async requireBooking(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new RpcException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found',
        status: 404,
      });
    }
    return booking;
  }

  private assertCancelAuthorized(booking: Booking, dto: CancelBookingDto): void {
    const isStaff = (STAFF_ROLES as readonly string[]).includes(dto.actorRole);
    if (isStaff) return;
    if (booking.customerId === dto.actorUserId) return;

    throw new RpcException({
      code: 'FORBIDDEN',
      message: 'Only the booking owner or staff can cancel this booking',
      status: 403,
    });
  }

  /** Snapshot CMS cancellation-policy (bilingual); fall back to stub if CMS unavailable. */
  private async loadCancellationPolicySnapshot(meta: {
    cancelledBy: string;
    actorRole: string;
    window: CancellationWindowCheck;
    staffOverride: boolean;
    overrideReason?: string;
  }): Promise<Record<string, unknown>> {
    const snapshottedAt = new Date().toISOString();
    const cancellationMeta = {
      cancelledAt: snapshottedAt,
      cancelledBy: meta.cancelledBy,
      actorRole: meta.actorRole,
      withinWindow: meta.window.withinWindow,
      hoursUntilStart: Number(meta.window.hoursUntilStart.toFixed(2)),
      staffOverride: meta.staffOverride,
      ...(meta.overrideReason ? { overrideReason: meta.overrideReason } : {}),
    };

    try {
      const [en, fr] = await Promise.all([
        this.fetchLegalPage(CANCELLATION_POLICY_SLUG, 'en'),
        this.fetchLegalPage(CANCELLATION_POLICY_SLUG, 'fr'),
      ]);
      return {
        slug: CANCELLATION_POLICY_SLUG,
        source: 'cms',
        snapshottedAt,
        titleEn: en.title,
        bodyEn: en.body,
        titleFr: fr.title,
        bodyFr: fr.body,
        publishedAt: en.publishedAt ?? fr.publishedAt,
        // Timing still stubbed until legal CMS exposes structured rules.
        timingRules: STUB_CANCELLATION_TIMING,
        cancellation: cancellationMeta,
      };
    } catch (error: unknown) {
      this.logger.warn(
        'CMS cancellation-policy unavailable; using stub snapshot',
        error instanceof Error ? error.message : String(error),
      );
      return {
        ...STUB_CANCELLATION_POLICY,
        snapshottedAt,
        cancellation: cancellationMeta,
      };
    }
  }

  private async fetchLegalPage(
    slug: string,
    locale: 'en' | 'fr',
  ): Promise<LegalPageDto> {
    return firstValueFrom(
      this.nats
        .send<LegalPageDto>(NATS_PATTERNS.cms.legal.get, { slug, locale })
        .pipe(
          timeout(5_000),
          catchError((err: unknown) => throwError(() => err)),
        ),
    );
  }

  private async publishOutbox(
    eventId: string,
    eventName: string,
    payload: object,
  ) {
    try {
      await firstValueFrom(
        this.nats.emit(eventName, payload).pipe(timeout(5000), defaultIfEmpty(null)),
      );
      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: { publishedAt: new Date() },
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to publish ${eventName} ${eventId}; left in outbox`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function eventNameForStatus(status: BookingStatus): string | null {
  switch (status) {
    case 'confirmed':
      return DOMAIN_EVENTS.bookingConfirmed;
    case 'cancelled':
      return DOMAIN_EVENTS.bookingCancelled;
    case 'in_progress':
      return DOMAIN_EVENTS.bookingStarted;
    case 'completed':
      return DOMAIN_EVENTS.bookingCompleted;
    default:
      return null;
  }
}

function toBookingDto(booking: Booking): BookingDto {
  return {
    id: booking.id,
    quoteId: booking.quoteId,
    customerId: booking.customerId,
    type: booking.type,
    status: booking.status as BookingStatusLabel,
    vehicleModelId: booking.vehicleModelId,
    unitId: booking.unitId,
    driverId: booking.driverId,
    pickupLabel: booking.pickupLabel,
    dropoffLabel: booking.dropoffLabel,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    duration: booking.duration ? DURATION_TO_LABEL[booking.duration] : null,
    flightNumber: booking.flightNumber,
    priceTnd: Number(booking.priceTnd),
    depositTnd: Number(booking.depositTnd),
    cancellationPolicySnapshot:
      booking.cancellationPolicySnapshot != null &&
      typeof booking.cancellationPolicySnapshot === 'object' &&
      !Array.isArray(booking.cancellationPolicySnapshot)
        ? (booking.cancellationPolicySnapshot as Record<string, unknown>)
        : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

function parseReservationDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RpcException({
      code: 'VALIDATION_ERROR',
      message: `Invalid ${field}`,
      status: 400,
      details: [{ field }],
    });
  }
  return date;
}

function reservationStatusWhere(
  status: ReservationStatusLabel,
): Prisma.QuoteWhereInput {
  switch (status) {
    case 'quote_requested':
      return {
        OR: [
          { status: 'received', booking: { is: null } },
          { booking: { is: { status: 'quote_requested' } } },
        ],
      };
    case 'quoted':
      return {
        OR: [
          { status: 'quoted', booking: { is: null } },
          { booking: { is: { status: 'quoted' } } },
        ],
      };
    case 'awaiting_payment':
    case 'confirmed':
    case 'in_progress':
    case 'completed':
    case 'no_show':
      return { booking: { is: { status } } };
    case 'cancelled':
      return {
        OR: [
          { status: 'cancelled', booking: { is: null } },
          { status: 'expired', booking: { is: null } },
          { booking: { is: { status: 'cancelled' } } },
        ],
      };
    default:
      return { status: 'converted', booking: { is: null } };
  }
}

function quoteStatusToReservationStatus(
  status: QuoteStatus,
): ReservationStatusLabel {
  switch (status) {
    case 'received':
      return 'quote_requested';
    case 'quoted':
      return 'quoted';
    case 'expired':
    case 'cancelled':
      return 'cancelled';
    case 'converted':
      return 'confirmed';
    default:
      return 'quote_requested';
  }
}

function toReservationDto(quote: QuoteWithBooking): ReservationDto {
  const booking = quote.booking;
  const vehicleModelId = booking?.vehicleModelId ?? quote.vehicleModelId;
  const status = booking
    ? (booking.status as ReservationStatusLabel)
    : quoteStatusToReservationStatus(quote.status);

  return {
    id: quote.id,
    status,
    quote: toQuoteDto(quote),
    customer: {
      id: quote.customerId,
      name: quote.customerName,
      phone: quote.customerPhone,
      email: quote.customerEmail,
      language: quote.language,
    },
    trip: {
      service: quote.service,
      vehicleModelId,
      pickupLocationId: quote.pickupLocationId,
      pickupLabel: booking?.pickupLabel ?? quote.pickupLabel,
      dropoffLocationId: quote.dropoffLocationId,
      dropoffLabel: booking?.dropoffLabel ?? quote.dropoffLabel,
      startAt: (booking?.startAt ?? quote.startAt).toISOString(),
      endAt: booking?.endAt?.toISOString() ?? quote.endAt?.toISOString() ?? null,
      passengers: quote.passengers,
      duration: quote.duration ? DURATION_TO_LABEL[quote.duration] : null,
      flightNumber: booking?.flightNumber ?? quote.flightNumber,
      notes: quote.notes,
    },
    vehicleModel: { id: vehicleModelId },
    fleetUnit: { id: booking?.unitId ?? null },
    driver: { id: booking?.driverId ?? null },
    booking: booking ? toBookingDto(booking) : null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: (booking?.updatedAt ?? quote.createdAt).toISOString(),
  };
}

/**
 * Nest NATS client surfaces RpcException payloads as plain objects / Error.
 * Re-throw as RpcException so gateway can map status/code.
 */
function mapFleetRpcError(error: unknown): RpcException {
  if (error instanceof RpcException) return error;

  const payload = extractRpcPayload(error);
  if (payload) {
    return new RpcException(payload);
  }

  return new RpcException({
    code: 'FLEET_UNAVAILABLE',
    message: 'Fleet calendar block failed',
    status: 503,
    details: [error instanceof Error ? error.message : String(error)],
  });
}

function extractRpcPayload(
  error: unknown,
): { code?: string; message?: string; status?: number; details?: unknown } | null {
  if (!error || typeof error !== 'object') return null;
  const obj = error as Record<string, unknown>;

  if (typeof obj.code === 'string' && (obj.message != null || obj.status != null)) {
    return obj as { code?: string; message?: string; status?: number; details?: unknown };
  }

  const nested = obj.error ?? obj.message;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    if (typeof n.code === 'string') {
      return n as { code?: string; message?: string; status?: number; details?: unknown };
    }
  }

  return null;
}
