import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export const UNIT_STATUSES = [
  'available',
  'reserved',
  'rented',
  'maintenance',
  'inactive',
] as const;
export type UnitStatusLabel = (typeof UNIT_STATUSES)[number];

export const CALENDAR_BLOCK_REASONS = ['booking', 'maintenance', 'hold'] as const;
export type CalendarBlockReasonLabel = (typeof CALENDAR_BLOCK_REASONS)[number];

/** Physical fleet unit — modelId/hubId are catalog UUID references, not SQL FKs. */
export class VehicleUnitDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  modelId!: string;

  @IsString()
  @MinLength(1)
  plate!: string;

  @IsUUID()
  hubId!: string;

  @IsString()
  @IsIn([...UNIT_STATUSES])
  status!: UnitStatusLabel;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmountTnd!: number;
}

export class CalendarBlockDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  /** ISO datetime — inclusive start of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  startAt!: string;

  /** ISO datetime — exclusive end of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  endAt!: string;

  @IsString()
  @IsIn([...CALENDAR_BLOCK_REASONS])
  reason!: CalendarBlockReasonLabel;
}

/**
 * NATS `fleet.availability.search` payload.
 * Range is half-open `[startAt, endAt)` — see exclusive-end rule in phase-d-fleet.md.
 */
export class SearchAvailabilityDto {
  @IsUUID()
  modelId!: string;

  @IsUUID()
  hubId!: string;

  /** ISO datetime — inclusive start */
  @IsString()
  @MinLength(1)
  startAt!: string;

  /** ISO datetime — exclusive end */
  @IsString()
  @MinLength(1)
  endAt!: string;
}

/**
 * Staff `GET /v1/ops/fleet/availability` query.
 * Maps to NATS as `start` → `startAt`, `end` → `endAt` (half-open).
 */
export class OpsFleetAvailabilityQueryDto {
  @IsUUID()
  modelId!: string;

  @IsUUID()
  hubId!: string;

  /** ISO datetime — inclusive start of half-open [start, end) */
  @IsString()
  @MinLength(1)
  start!: string;

  /** ISO datetime — exclusive end of half-open [start, end) */
  @IsString()
  @MinLength(1)
  end!: string;
}

/**
 * NATS `fleet.hold.acquire` — short-TTL Redis checkout lock on a unit.
 * Concurrent acquire on the same unit fails with 409 until release or TTL.
 */
export class AcquireHoldDto {
  @IsUUID()
  unitId!: string;

  /** ISO datetime — inclusive start of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  startAt!: string;

  /** ISO datetime — exclusive end of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  endAt!: string;

  /** Optional booking reference stored on the hold payload */
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

/** NATS `fleet.hold.release` — free the lock on confirm/cancel (TTL also expires it). */
export class ReleaseHoldDto {
  @IsUUID()
  unitId!: string;

  /** Must match the holdId returned by acquire */
  @IsUUID()
  holdId!: string;
}

export class UnitHoldDto {
  @IsUUID()
  holdId!: string;

  @IsUUID()
  unitId!: string;

  @IsString()
  @MinLength(1)
  startAt!: string;

  @IsString()
  @MinLength(1)
  endAt!: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  /** ISO datetime when Redis TTL will drop the hold */
  @IsString()
  @MinLength(1)
  expiresAt!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  ttlSeconds!: number;
}

/**
 * NATS `fleet.calendar.block` — persist a CalendarBlock (booking / maintenance / hold).
 * Range is half-open `[startAt, endAt)`. Idempotent when `bookingId` is set.
 */
export class BlockCalendarDto {
  @IsUUID()
  unitId!: string;

  /** ISO datetime — inclusive start of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  startAt!: string;

  /** ISO datetime — exclusive end of half-open [startAt, endAt) */
  @IsString()
  @MinLength(1)
  endAt!: string;

  @IsString()
  @IsIn([...CALENDAR_BLOCK_REASONS])
  reason!: CalendarBlockReasonLabel;

  /** Required for reason=booking; enables idempotent create / saga release */
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

/** NATS `fleet.calendar.release` — remove block(s) for a booking (confirm compensate / cancel). */
export class ReleaseCalendarBlockDto {
  @IsUUID()
  bookingId!: string;
}
