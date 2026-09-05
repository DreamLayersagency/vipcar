import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  type BlockCalendarDto,
  type BookingConfirmedEventDto,
  type BookingStatusChangedEventDto,
  type CalendarBlockDto,
  type ReleaseCalendarBlockDto,
} from '@vipcar/contracts';
import { Prisma } from '../../generated/prisma';
import type { CalendarBlock } from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

/**
 * Persist CalendarBlocks for booking confirm (and maintenance/hold commands).
 * Ranges are half-open `[startAt, endAt)`. Idempotent by bookingId when set.
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async block(dto: BlockCalendarDto): Promise<{ data: CalendarBlockDto }> {
    if (dto.reason === 'booking' && !dto.bookingId) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'bookingId is required when reason is booking',
        status: 400,
      });
    }

    const startAt = parseDate(dto.startAt, 'startAt');
    const endAt = parseDate(dto.endAt, 'endAt');
    if (!(startAt < endAt)) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'startAt must be before endAt (exclusive end)',
        status: 400,
      });
    }

    if (dto.bookingId) {
      const existing = await this.prisma.calendarBlock.findUnique({
        where: { bookingId: dto.bookingId },
      });
      if (existing) {
        return { data: toBlockDto(existing) };
      }
    }

    const unit = await this.prisma.vehicleUnit.findUnique({
      where: { id: dto.unitId },
    });
    if (!unit) {
      throw new RpcException({
        code: 'UNIT_NOT_FOUND',
        message: 'Vehicle unit not found',
        status: 404,
      });
    }
    if (unit.status === 'maintenance' || unit.status === 'inactive') {
      throw new RpcException({
        code: 'UNIT_UNAVAILABLE',
        message: 'Unit is not available for calendar block',
        status: 409,
      });
    }

    const overlap = await this.prisma.calendarBlock.findFirst({
      where: {
        unitId: dto.unitId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(dto.bookingId
          ? { NOT: { bookingId: dto.bookingId } }
          : {}),
      },
      select: { id: true },
    });
    if (overlap) {
      throw new RpcException({
        code: 'UNIT_BLOCKED',
        message: 'Unit has an overlapping calendar block',
        status: 409,
      });
    }

    try {
      const created = await this.prisma.calendarBlock.create({
        data: {
          unitId: dto.unitId,
          bookingId: dto.bookingId ?? null,
          startAt,
          endAt,
          reason: dto.reason,
        },
      });
      return { data: toBlockDto(created) };
    } catch (error: unknown) {
      if (isUniqueViolation(error) && dto.bookingId) {
        const again = await this.prisma.calendarBlock.findUnique({
          where: { bookingId: dto.bookingId },
        });
        if (again) return { data: toBlockDto(again) };
      }
      throw error;
    }
  }

  async release(
    dto: ReleaseCalendarBlockDto,
  ): Promise<{ data: { released: boolean } }> {
    const result = await this.prisma.calendarBlock.deleteMany({
      where: { bookingId: dto.bookingId },
    });
    return { data: { released: result.count > 0 } };
  }

  /**
   * Idempotent consumer for booking.confirmed.
   * Creates CalendarBlock for unitId/[startAt,endAt). Never throws to NATS —
   * conflicts are logged (saga already blocked confirm when sync path is used).
   */
  async onBookingConfirmed(event: BookingConfirmedEventDto): Promise<void> {
    try {
      const booking = event.booking;
      if (!booking.unitId) {
        this.logger.warn(
          `booking.confirmed ${event.eventId}: booking ${booking.id} has no unitId; skip calendar block`,
        );
        return;
      }

      await this.block({
        unitId: booking.unitId,
        bookingId: booking.id,
        startAt: booking.startAt,
        endAt: booking.endAt,
        reason: 'booking',
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to apply calendar block for booking.confirmed ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Idempotent consumer for booking.cancelled — drop CalendarBlock(s) for booking.
   */
  async onBookingCancelled(event: BookingStatusChangedEventDto): Promise<void> {
    try {
      await this.release({ bookingId: event.booking.id });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to release calendar block for booking.cancelled ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RpcException({
      code: 'VALIDATION_ERROR',
      message: `Invalid ${field}`,
      status: 400,
    });
  }
  return date;
}

function toBlockDto(block: CalendarBlock): CalendarBlockDto {
  return {
    id: block.id,
    unitId: block.unitId,
    ...(block.bookingId ? { bookingId: block.bookingId } : {}),
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    reason: block.reason,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}
