import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { CHAUFFEUR_DURATIONS, type ChauffeurDurationLabel } from './booking.dto';
import { LOCALES, type LocaleLabel } from './catalog.dto';
import { ROLES, type Role } from './roles';

export const DRIVER_STATUSES = [
  'available',
  'on_trip',
  'off_duty',
  'inactive',
] as const;
export type DriverStatusLabel = (typeof DRIVER_STATUSES)[number];

export const ASSIGNMENT_TYPES = ['transfer', 'chauffeur'] as const;
export type AssignmentTypeLabel = (typeof ASSIGNMENT_TYPES)[number];

export const ASSIGNMENT_STATUSES = [
  'pending',
  'assigned',
  'en_route',
  'arrived',
  'completed',
  'cancelled',
] as const;
export type AssignmentStatusLabel = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * Dispatch Driver — `userId` is identity User.id with role `driver` only (no SQL FK).
 * `hubId` is a catalog Hub.id reference.
 */
export class DriverDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...LOCALES], { each: true })
  languages!: LocaleLabel[];

  @IsUUID()
  hubId!: string;

  @IsString()
  @IsIn([...DRIVER_STATUSES])
  status!: DriverStatusLabel;

  @IsString()
  @MinLength(1)
  phone!: string;
}

/**
 * Transfer or chauffeur Assignment.
 * `bookingId` / `driverId` are copied UUIDs — no cross-schema SQL joins.
 */
export class AssignmentDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsString()
  @IsIn([...ASSIGNMENT_TYPES])
  type!: AssignmentTypeLabel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  flightNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn([...CHAUFFEUR_DURATIONS])
  duration?: ChauffeurDurationLabel;

  @IsString()
  @IsIn([...ASSIGNMENT_STATUSES])
  status!: AssignmentStatusLabel;

  /** ISO datetime */
  @IsString()
  @MinLength(1)
  scheduledAt!: string;
}

/** NATS `dispatch.driver.list` — filter by hub (optional status). */
export class ListDriversDto {
  @IsOptional()
  @IsUUID()
  hubId?: string;

  @IsOptional()
  @IsString()
  @IsIn([...DRIVER_STATUSES])
  status?: DriverStatusLabel;
}

/**
 * NATS `dispatch.assign` — ops assigns a driver to a booking (G4 HTTP wraps this).
 */
export class AssignDriverDto {
  @IsUUID()
  bookingId!: string;

  @IsUUID()
  driverId!: string;
}

export const TRIP_PROGRESS_STATUSES = [
  'en_route',
  'arrived',
  'completed',
] as const;
export type TripProgressStatusLabel = (typeof TRIP_PROGRESS_STATUSES)[number];

/** Roles allowed to update trip status (G5). */
export const DISPATCH_TRIP_ROLES = ['driver', 'ops_agent', 'admin'] as const;
export type DispatchTripRole = (typeof DISPATCH_TRIP_ROLES)[number];

/**
 * NATS `dispatch.trip.status` — driver/ops trip progress (G5).
 */
export class UpdateTripStatusDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @IsIn([...TRIP_PROGRESS_STATUSES])
  status!: TripProgressStatusLabel;

  @IsUUID()
  actorUserId!: string;

  @IsString()
  @IsIn([...ROLES])
  actorRole!: Role;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/** HTTP body for `POST /v1/ops/dispatch/trip/status`. */
export class UpdateTripStatusHttpDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @IsIn([...TRIP_PROGRESS_STATUSES])
  status!: TripProgressStatusLabel;
}

/** Domain event `dispatch.assigned`. */
export class DispatchAssignedEventDto {
  @IsUUID()
  eventId!: string;

  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsUUID()
  assignmentId!: string;

  @IsUUID()
  bookingId!: string;

  @IsUUID()
  driverId!: string;

  /** Optional snapshots so notify can message without a follow-up fetch. */
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsIn([...LOCALES])
  locale?: LocaleLabel;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;
}

/**
 * Domain event `dispatch.trip.status.changed`.
 * Emitted for en_route / arrived / completed so notify can message the customer.
 */
export class DispatchTripStatusEventDto {
  @IsUUID()
  eventId!: string;

  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsUUID()
  assignmentId!: string;

  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsString()
  @IsIn([...TRIP_PROGRESS_STATUSES])
  status!: TripProgressStatusLabel;

  @IsOptional()
  @IsString()
  @IsIn([...ASSIGNMENT_STATUSES])
  fromStatus?: AssignmentStatusLabel;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsIn([...LOCALES])
  locale?: LocaleLabel;
}

/** Domain event `dispatch.trip.completed`. */
export class DispatchTripCompletedEventDto {
  @IsUUID()
  eventId!: string;

  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsUUID()
  assignmentId!: string;

  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}
