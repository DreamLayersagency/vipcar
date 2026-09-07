import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LOCALES, type LocaleLabel } from './catalog.dto';
import { ROLES, type Role } from './roles';

export const SERVICE_TYPES = ['rental', 'transfer', 'chauffeur'] as const;
export type ServiceTypeLabel = (typeof SERVICE_TYPES)[number];

export const QUOTE_STATUSES = [
  'received',
  'quoted',
  'expired',
  'converted',
  'cancelled',
] as const;
export type QuoteStatusLabel = (typeof QUOTE_STATUSES)[number];

export const CHANNELS = ['web', 'whatsapp', 'staff', 'contact'] as const;
export type ChannelLabel = (typeof CHANNELS)[number];

export const CHAUFFEUR_DURATIONS = ['hourly', 'half-day', 'full-day'] as const;
export type ChauffeurDurationLabel = (typeof CHAUFFEUR_DURATIONS)[number];

/** NATS `booking.quote.create` payload (domain shape; gateway maps HTTP fields). */
export class CreateQuoteDto {
  @IsString()
  @IsIn([...SERVICE_TYPES])
  service!: ServiceTypeLabel;

  @IsOptional()
  @IsUUID()
  vehicleModelId?: string;

  @IsOptional()
  @IsUUID()
  pickupLocationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  pickupLabel?: string;

  @IsOptional()
  @IsUUID()
  dropoffLocationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  dropoffLabel?: string;

  /** ISO date or datetime */
  @IsString()
  @MinLength(1)
  startAt!: string;

  /** Required for rental; optional for transfer/chauffeur. */
  @ValidateIf((o: CreateQuoteDto) => o.service === 'rental')
  @IsString()
  @MinLength(1)
  endAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers?: number;

  /** Required for chauffeur (`hourly` | `half-day` | `full-day`). */
  @ValidateIf((o: CreateQuoteDto) => o.service === 'chauffeur')
  @IsString()
  @IsIn([...CHAUFFEUR_DURATIONS])
  duration?: ChauffeurDurationLabel;

  /** Optional; only meaningful for transfer (booking rejects other combos). */
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsString()
  @MinLength(1)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @IsIn([...LOCALES])
  locale!: LocaleLabel;

  @IsString()
  @IsIn([...CHANNELS])
  channel!: ChannelLabel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  indicativePriceTnd?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/**
 * Public HTTP `POST /v1/contact` body (contact page).
 * Gateway maps to a Quote with `channel=contact` via `booking.quote.create`.
 */
export class CreateContactHttpDto {
  @IsString()
  @MinLength(1)
  name!: string;

  /** Phone, WhatsApp, or email (free-text as on the SPA form). */
  @IsString()
  @MinLength(1)
  contact!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel;
}

/**
 * Public HTTP `POST /v1/quotes` body (SPA widget / wizard).
 * Gateway maps to `CreateQuoteDto` before `booking.quote.create`.
 */
export class CreateQuoteHttpDto {
  @IsString()
  @IsIn([...SERVICE_TYPES])
  service!: ServiceTypeLabel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  vehicleSlug?: string;

  @IsString()
  @MinLength(1)
  pickup!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  dropoff?: string;

  @IsString()
  @MinLength(1)
  startDate!: string;

  @ValidateIf((o: CreateQuoteHttpDto) => o.service === 'rental')
  @IsString()
  @MinLength(1)
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers?: number;

  @ValidateIf((o: CreateQuoteHttpDto) => o.service === 'chauffeur')
  @IsString()
  @IsIn([...CHAUFFEUR_DURATIONS])
  duration?: ChauffeurDurationLabel;

  /** Optional; only meaningful for transfer (booking rejects other combos). */
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn([...LOCALES])
  locale?: LocaleLabel;

  @IsOptional()
  @IsString()
  @IsIn([...CHANNELS])
  channel?: ChannelLabel;
}

/** Staff inbox `GET /v1/ops/quotes` query (and NATS `booking.quote.list`). */
export class ListQuotesDto {
  @IsOptional()
  @IsString()
  @IsIn([...QUOTE_STATUSES])
  status?: QuoteStatusLabel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QuoteDto {
  id!: string;
  service!: ServiceTypeLabel;
  status!: QuoteStatusLabel;
  vehicleModelId!: string | null;
  pickupLocationId!: string | null;
  pickupLabel!: string | null;
  dropoffLocationId!: string | null;
  dropoffLabel!: string | null;
  startAt!: string;
  endAt!: string | null;
  passengers!: number | null;
  duration!: ChauffeurDurationLabel | null;
  flightNumber!: string | null;
  notes!: string | null;
  customerName!: string;
  customerPhone!: string;
  customerEmail!: string | null;
  customerId!: string | null;
  language!: LocaleLabel;
  channel!: ChannelLabel;
  indicativePriceTnd!: number | null;
  confirmedPriceTnd!: number | null;
  createdAt!: string;
}

export class QuoteCreatedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  quote!: QuoteDto;
}

/**
 * NATS `booking.quote.price` — ops sets confirmedPriceTnd before payment.
 * For chauffeur quotes, duration is already on the quote and is snapshotted onto Booking.
 */
export class SetQuotePriceDto {
  @IsUUID()
  quoteId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  confirmedPriceTnd!: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/** HTTP body for `PATCH /v1/ops/quotes/:id`. */
export class PatchQuoteHttpDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  confirmedPriceTnd!: number;
}

export class QuotePricedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  quote!: QuoteDto;
}

export const BOOKING_STATUSES = [
  'quote_requested',
  'quoted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type BookingStatusLabel = (typeof BOOKING_STATUSES)[number];

/** Unified operational status used by the staff reservation workspace. */
export const RESERVATION_STATUSES = [...BOOKING_STATUSES] as const;
export type ReservationStatusLabel = (typeof RESERVATION_STATUSES)[number];

/** Staff inbox `GET /v1/ops/reservations` query. */
export class ListReservationsDto {
  @IsOptional()
  @IsString()
  @IsIn([...RESERVATION_STATUSES])
  status?: ReservationStatusLabel;

  @IsOptional()
  @IsString()
  @IsIn([...SERVICE_TYPES])
  service?: ServiceTypeLabel;

  @IsOptional()
  @IsString()
  @IsIn([...CHANNELS])
  channel?: ChannelLabel;

  /** ISO datetime lower bound for the trip start. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  from?: string;

  /** ISO datetime upper bound for the trip start. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  to?: string;

  /** Matches reservation id, customer contact, trip locations or flight. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/** NATS `booking.ops.reservation.get` — accepts quoteId or bookingId. */
export class GetReservationDto {
  @IsUUID()
  reservationId!: string;
}

/** NATS `booking.ops.reservation.assign` — assign a fleet unit before confirm. */
export class AssignReservationUnitDto {
  @IsUUID()
  quoteId!: string;

  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/** HTTP body for `POST /v1/ops/reservations/:id/assign`. */
export class AssignReservationUnitHttpDto {
  @IsUUID()
  unitId!: string;
}

/** HTTP body for `PATCH /v1/ops/reservations/:id/status`. */
export class UpdateReservationStatusHttpDto {
  @IsString()
  @IsIn([...RESERVATION_STATUSES])
  status!: ReservationStatusLabel;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTnd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositTnd?: number;
}

export class BookingDto {
  id!: string;
  quoteId!: string;
  customerId!: string;
  type!: ServiceTypeLabel;
  status!: BookingStatusLabel;
  vehicleModelId!: string | null;
  unitId!: string | null;
  driverId!: string | null;
  pickupLabel!: string;
  dropoffLabel!: string | null;
  startAt!: string;
  endAt!: string;
  /** Chauffeur duration snapshot (`hourly` | `half-day` | `full-day`). */
  duration!: ChauffeurDurationLabel | null;
  /** Transfer flight number snapshot from quote (dispatch Assignment). */
  flightNumber!: string | null;
  priceTnd!: number;
  depositTnd!: number;
  cancellationPolicySnapshot!: Record<string, unknown> | null;
  createdAt!: string;
  updatedAt!: string;
}

/** Stable operational resource references; enrichment comes from owning services. */
export class ReservationResourceRefDto {
  id!: string | null;
}

export class ReservationCustomerDto {
  id!: string | null;
  name!: string;
  phone!: string;
  email!: string | null;
  language!: LocaleLabel;
}

export class ReservationTripDto {
  service!: ServiceTypeLabel;
  vehicleModelId!: string | null;
  pickupLocationId!: string | null;
  pickupLabel!: string | null;
  dropoffLocationId!: string | null;
  dropoffLabel!: string | null;
  startAt!: string;
  endAt!: string | null;
  passengers!: number | null;
  duration!: ChauffeurDurationLabel | null;
  flightNumber!: string | null;
  notes!: string | null;
}

/** Unified staff view: quote → customer → trip → resources → booking. */
export class ReservationDto {
  /** Canonical reservation reference: the originating quote id. */
  id!: string;
  status!: ReservationStatusLabel;
  quote!: QuoteDto;
  customer!: ReservationCustomerDto;
  trip!: ReservationTripDto;
  vehicleModel!: ReservationResourceRefDto;
  fleetUnit!: ReservationResourceRefDto;
  driver!: ReservationResourceRefDto;
  booking!: BookingDto | null;
  createdAt!: string;
  updatedAt!: string;
}

/** NATS `booking.get` — load a booking by id (gateway enforces owner/staff). */
export class GetBookingDto {
  @IsUUID()
  bookingId!: string;
}

/**
 * NATS `booking.list` / HTTP `GET /v1/me/bookings`.
 * Gateway sets `customerId` from JWT; never accept it from the client query.
 */
export class ListMyBookingsDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/** HTTP query for `GET /v1/me/bookings` (customerId comes from JWT). */
export class ListMyBookingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * NATS `booking.cancel` / HTTP `POST /v1/bookings/:id/cancel`.
 * Customer may cancel own booking; staff (`ops_agent` | `admin`) any booking.
 * Staff override outside the free-cancel window requires `reason` (logged).
 */
export class CancelBookingDto {
  @IsUUID()
  bookingId!: string;

  @IsUUID()
  actorUserId!: string;

  @IsString()
  @IsIn([...ROLES])
  actorRole!: Role;

  /** Required for staff when cancelling outside the free-cancel window. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/** HTTP body for `POST /v1/bookings/:id/cancel`. */
export class CancelBookingBodyDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

/**
 * HTTP body for ops confirm:
 * - `POST /v1/ops/bookings/:id/confirm`
 * - `POST /v1/ops/quotes/:id/confirm` (create-from-quote then confirm)
 * `unitId` is required when the booking has none (fleet calendar block).
 */
export class ConfirmBookingHttpDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTnd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositTnd?: number;
}

/**
 * NATS `booking.confirm` — after payment or manual ops confirm.
 * Provide bookingId, or quoteId to create-from-quote then confirm.
 */
export class ConfirmBookingDto {
  @ValidateIf((o: ConfirmBookingDto) => !o.quoteId)
  @IsUUID()
  bookingId?: string;

  @ValidateIf((o: ConfirmBookingDto) => !o.bookingId)
  @IsUUID()
  quoteId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTnd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositTnd?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/**
 * NATS `booking.status.update`.
 * With quoteId and no booking yet: creates at `quote_requested` then applies `status` if different.
 */
export class UpdateBookingStatusDto {
  @ValidateIf((o: UpdateBookingStatusDto) => !o.quoteId)
  @IsUUID()
  bookingId?: string;

  @ValidateIf((o: UpdateBookingStatusDto) => !o.bookingId)
  @IsUUID()
  quoteId?: string;

  @IsString()
  @IsIn([...BOOKING_STATUSES])
  status!: BookingStatusLabel;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTnd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositTnd?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class BookingConfirmedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  booking!: BookingDto;
}

export class BookingStatusChangedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  booking!: BookingDto;
  fromStatus!: BookingStatusLabel;
  toStatus!: BookingStatusLabel;
}
