import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const PAYMENT_KINDS = [
  'deposit',
  'rental',
  'transfer',
  'chauffeur',
  'invoice',
] as const;
export type PaymentKindLabel = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'released',
] as const;
export type PaymentStatusLabel = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = [
  'manual',
  'konnect',
  'flouci',
  'stripe',
] as const;
export type PaymentProviderLabel = (typeof PAYMENT_PROVIDERS)[number];

export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'paid',
  'void',
] as const;
export type InvoiceStatusLabel = (typeof INVOICE_STATUSES)[number];

export class PaymentDto {
  id!: string;
  bookingId!: string;
  kind!: PaymentKindLabel;
  amountTnd!: number;
  provider!: PaymentProviderLabel;
  providerRef!: string | null;
  status!: PaymentStatusLabel;
  createdAt!: string;
  updatedAt!: string;
}

export class InvoiceLineDto {
  description!: string;
  quantity!: number;
  unitAmountTnd!: number;
  totalTnd!: number;
}

export class InvoiceDto {
  id!: string;
  number!: string;
  bookingId!: string | null;
  customerId!: string | null;
  corporateAccountId!: string | null;
  /** Snapshot from CorporateBillingProfile at create (H4). */
  companyName!: string | null;
  billingEmail!: string | null;
  taxId!: string | null;
  lines!: InvoiceLineDto[];
  subtotalTnd!: number;
  taxTnd!: number;
  totalTnd!: number;
  pdfKey!: string | null;
  status!: InvoiceStatusLabel;
  createdAt!: string;
  updatedAt!: string;
}

/** Stored invoicing profile for a corporate account (billing schema, H4). */
export class CorporateBillingProfileDto {
  id!: string;
  corporateAccountId!: string;
  companyName!: string;
  billingEmail!: string;
  taxId!: string | null;
  notes!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

/**
 * NATS `billing.corporateProfile.upsert` — create/update invoicing profile.
 * Keyed by corporateAccountId (identity CorporateAccount.id).
 */
export class UpsertCorporateBillingProfileDto {
  @IsUUID()
  corporateAccountId!: string;

  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsEmail()
  billingEmail!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  taxId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** NATS `billing.corporateProfile.get`. */
export class GetCorporateBillingProfileDto {
  @IsUUID()
  corporateAccountId!: string;
}

/** Line input for `billing.invoice.create` — line total is computed server-side. */
export class CreateInvoiceLineDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitAmountTnd!: number;
}

/**
 * NATS `billing.invoice.create` — corporate / post-paid invoice.
 * Requires corporateAccountId and an existing CorporateBillingProfile (H4);
 * stores lines, tax, status, optional PDF object key, and buyer snapshot.
 */
export class CreateInvoiceDto {
  @IsUUID()
  corporateAccountId!: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines!: CreateInvoiceLineDto[];

  /** Tax amount in TND (not a rate). Added to subtotal. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxTnd!: number;

  @IsOptional()
  @IsString()
  @IsIn([...INVOICE_STATUSES])
  status?: InvoiceStatusLabel;

  /** Object-storage key for a generated PDF; optional at create time. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  pdfKey?: string;

  /** Explicit invoice number; auto-generated when omitted. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  number?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/**
 * HTTP `POST /v1/billing/checkout` body (auth customer).
 * Gateway loads the booking deposit and calls `billing.checkout.create`.
 */
export class CheckoutHttpDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  @IsIn([...PAYMENT_PROVIDERS])
  provider?: PaymentProviderLabel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  returnUrl?: string;
}

/**
 * NATS `billing.checkout.create` — start deposit/balance payment for a booking.
 * Default provider is `manual` until a PSP adapter is configured.
 */
export class CreateCheckoutDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @IsIn([...PAYMENT_KINDS])
  kind!: PaymentKindLabel;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountTnd!: number;

  @IsOptional()
  @IsString()
  @IsIn([...PAYMENT_PROVIDERS])
  provider?: PaymentProviderLabel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class CheckoutResultDto {
  payment!: PaymentDto;
  /** Redirect URL for hosted PSP checkout; absent for `manual`. */
  checkoutUrl?: string;
  /** Staff/customer instructions when no hosted checkout (manual provider). */
  instructions?: string;
}

/** NATS `billing.payment.get` — payments for a booking (newest first). */
export class GetPaymentDto {
  @IsUUID()
  bookingId!: string;
}

/**
 * Staff capture for the `manual` provider (no PSP webhook).
 * Used by ops later; ManualProvider implements this path.
 */
export class MarkPaymentPaidDto {
  @IsUUID()
  paymentId!: string;

  @IsOptional()
  @IsUUID()
  markedByUserId?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

/**
 * NATS `billing.webhook.handle` — gateway forwards PSP webhooks.
 * Signature / provider API verification happens in billing.
 */
export class HandleWebhookDto {
  @IsString()
  @IsIn([...PAYMENT_PROVIDERS])
  provider!: PaymentProviderLabel;

  /** Parsed JSON body from the PSP (shape varies by provider). */
  body!: Record<string, unknown>;

  /** Lowercase header map (e.g. x-vipcar-webhook-secret, stripe-signature). */
  @IsOptional()
  headers?: Record<string, string>;

  /** Query string (Konnect may send payment_ref; optional shared token). */
  @IsOptional()
  query?: Record<string, string>;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class WebhookResultDto {
  /** Whether the payment was newly transitioned to captured/failed. */
  applied!: boolean;
  /** True when providerRef was already in a terminal status (idempotent replay). */
  idempotent!: boolean;
  payment!: PaymentDto | null;
}

/** Domain event `billing.payment.captured`. */
export class PaymentCapturedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  payment!: PaymentDto;
}

/** Domain event `billing.payment.failed`. */
export class PaymentFailedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  payment!: PaymentDto;
}

/**
 * Domain event `billing.deposit.released`.
 * Emitted after a captured deposit Payment moves to `released` on booking.completed.
 * Optional customer snapshot lets notify message the customer without a follow-up fetch.
 */
export class DepositReleasedEventDto {
  eventId!: string;
  occurredAt!: string;
  correlationId?: string;
  payment!: PaymentDto;
  bookingId!: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  locale?: 'en' | 'fr';
}
