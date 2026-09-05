import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CheckoutResultDto,
  CreateCheckoutDto,
  DOMAIN_EVENTS,
  GetPaymentDto,
  HandleWebhookDto,
  MarkPaymentPaidDto,
  NATS_PATTERNS,
  PAYMENT_PROVIDERS,
  PaymentCapturedEventDto,
  PaymentDto,
  PaymentFailedEventDto,
  DepositReleasedEventDto,
  WebhookResultDto,
  type BookingStatusChangedEventDto,
  type PaymentProviderLabel,
  type PaymentStatusLabel,
  type PublicUserDto,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import { defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';
import type { Payment } from '../../generated/prisma';
import { Prisma } from '../../generated/prisma';
import {
  BILLING_NATS,
  PAYMENT_PROVIDER,
  PAYMENT_PROVIDERS_MAP,
} from '../billing.constants';
import type { PaymentProvider } from '../providers/payment-provider';
import { PrismaService } from '../prisma.service';

const TERMINAL_STATUSES = new Set<PaymentStatusLabel>([
  'captured',
  'failed',
  'refunded',
  'released',
]);

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly defaultProvider: PaymentProviderLabel;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(PAYMENT_PROVIDERS_MAP)
    private readonly providers: Record<PaymentProviderLabel, PaymentProvider>,
    @Inject(BILLING_NATS) private readonly nats: ClientProxy,
  ) {
    const configured = (this.config.get<string>('BILLING_DEFAULT_PROVIDER') ?? 'manual')
      .trim()
      .toLowerCase();
    this.defaultProvider = isPaymentProvider(configured) ? configured : 'manual';
  }

  async createCheckout(dto: CreateCheckoutDto): Promise<{ data: CheckoutResultDto }> {
    const providerName = dto.provider ?? this.defaultProvider;
    if (providerName !== this.provider.name) {
      throw new RpcException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Provider "${providerName}" is not configured; active provider is "${this.provider.name}"`,
        status: 400,
        details: [{ requested: providerName, active: this.provider.name }],
      });
    }

    const paymentId = randomUUID();
    const checkout = await this.provider.createCheckout({
      paymentId,
      bookingId: dto.bookingId,
      kind: dto.kind,
      amountTnd: dto.amountTnd,
      returnUrl: dto.returnUrl,
    });

    let payment: Payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          id: paymentId,
          bookingId: dto.bookingId,
          kind: dto.kind,
          amountTnd: new Prisma.Decimal(dto.amountTnd),
          provider: providerName,
          providerRef: checkout.providerRef ?? null,
          status: 'pending',
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new RpcException({
          code: 'PAYMENT_CONFLICT',
          message: 'A payment with this provider reference already exists',
          status: 409,
        });
      }
      throw error;
    }

    this.logger.log(
      `checkout created paymentId=${payment.id} bookingId=${payment.bookingId} provider=${providerName}`,
    );

    return {
      data: {
        payment: toPaymentDto(payment),
        ...(checkout.checkoutUrl ? { checkoutUrl: checkout.checkoutUrl } : {}),
        ...(checkout.instructions ? { instructions: checkout.instructions } : {}),
      },
    };
  }

  async getByBooking(dto: GetPaymentDto): Promise<{ data: PaymentDto[] }> {
    const rows = await this.prisma.payment.findMany({
      where: { bookingId: dto.bookingId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map(toPaymentDto) };
  }

  /**
   * Staff marks a manual payment as captured (no PSP webhook).
   * Callable from ops HTTP in a later phase; kept here so ManualProvider works end-to-end.
   */
  async markPaid(dto: MarkPaymentPaidDto): Promise<{ data: PaymentDto }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });
    if (!payment) {
      throw new RpcException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
        status: 404,
      });
    }

    if (payment.status === 'captured') {
      return { data: toPaymentDto(payment) };
    }

    if (payment.status !== 'pending' && payment.status !== 'authorized') {
      throw new RpcException({
        code: 'ILLEGAL_PAYMENT_STATUS',
        message: `Cannot mark payment as paid from status ${payment.status}`,
        status: 409,
        details: [{ from: payment.status, to: 'captured' }],
      });
    }

    if (payment.provider !== this.provider.name) {
      throw new RpcException({
        code: 'PROVIDER_MISMATCH',
        message: `Payment provider is "${payment.provider}"; active provider is "${this.provider.name}"`,
        status: 400,
      });
    }

    const result = await this.provider.markPaid({
      paymentId: payment.id,
      providerRef: payment.providerRef,
      markedByUserId: dto.markedByUserId,
    });

    const eventId = randomUUID();
    const occurredAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'captured',
          providerRef: result.providerRef,
        },
      });
      const payload: PaymentCapturedEventDto = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        correlationId: dto.correlationId,
        payment: toPaymentDto(next),
      };
      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName: DOMAIN_EVENTS.billingPaymentCaptured,
          payload: payload as object,
        },
      });
      return next;
    });

    await this.publishOutbox(eventId, DOMAIN_EVENTS.billingPaymentCaptured, {
      eventId,
      occurredAt: occurredAt.toISOString(),
      correlationId: dto.correlationId,
      payment: toPaymentDto(updated),
    } satisfies PaymentCapturedEventDto);

    return { data: toPaymentDto(updated) };
  }

  /**
   * PSP webhook: verify signature / provider API, update Payment by providerRef,
   * emit billing.payment.captured (or failed). Idempotent on providerRef.
   */
  async handleWebhook(dto: HandleWebhookDto): Promise<{ data: WebhookResultDto }> {
    const adapter = this.providers[dto.provider];
    if (!adapter) {
      throw new RpcException({
        code: 'PROVIDER_UNKNOWN',
        message: `Unknown payment provider "${dto.provider}"`,
        status: 400,
      });
    }

    const verified = await adapter.verifyWebhook({
      body: dto.body ?? {},
      headers: normalizeHeaders(dto.headers),
      query: dto.query ?? {},
    });

    let payment =
      (await this.prisma.payment.findUnique({
        where: {
          provider_providerRef: {
            provider: dto.provider,
            providerRef: verified.providerRef,
          },
        },
      })) ?? null;

    if (!payment && verified.paymentIdHint) {
      payment = await this.prisma.payment.findUnique({
        where: { id: verified.paymentIdHint },
      });
      if (payment && payment.provider !== dto.provider) {
        payment = null;
      }
    }

    if (!payment) {
      throw new RpcException({
        code: 'PAYMENT_NOT_FOUND',
        message: `No payment for providerRef ${verified.providerRef}`,
        status: 404,
        details: [{ provider: dto.provider, providerRef: verified.providerRef }],
      });
    }

    if (verified.status === 'pending' || verified.status === 'authorized') {
      if (payment.status === 'pending' && verified.status === 'authorized') {
        const updated = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'authorized',
            providerRef: verified.providerRef,
          },
        });
        return {
          data: {
            applied: true,
            idempotent: false,
            payment: toPaymentDto(updated),
          },
        };
      }
      return {
        data: {
          applied: false,
          idempotent: false,
          payment: toPaymentDto(payment),
        },
      };
    }

    const targetStatus = verified.status;
    if (TERMINAL_STATUSES.has(payment.status as PaymentStatusLabel)) {
      if (payment.status === targetStatus) {
        this.logger.log(
          `webhook idempotent paymentId=${payment.id} providerRef=${verified.providerRef} status=${payment.status}`,
        );
        return {
          data: {
            applied: false,
            idempotent: true,
            payment: toPaymentDto(payment),
          },
        };
      }
      throw new RpcException({
        code: 'ILLEGAL_PAYMENT_STATUS',
        message: `Payment already ${payment.status}; cannot apply ${targetStatus}`,
        status: 409,
        details: [{ from: payment.status, to: targetStatus }],
      });
    }

    const eventId = randomUUID();
    const occurredAt = new Date();
    const eventName =
      targetStatus === 'captured'
        ? DOMAIN_EVENTS.billingPaymentCaptured
        : DOMAIN_EVENTS.billingPaymentFailed;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.payment.update({
        where: { id: payment!.id },
        data: {
          status: targetStatus,
          providerRef: verified.providerRef,
        },
      });

      const payload =
        targetStatus === 'captured'
          ? ({
              eventId,
              occurredAt: occurredAt.toISOString(),
              correlationId: dto.correlationId,
              payment: toPaymentDto(next),
            } satisfies PaymentCapturedEventDto)
          : ({
              eventId,
              occurredAt: occurredAt.toISOString(),
              correlationId: dto.correlationId,
              payment: toPaymentDto(next),
            } satisfies PaymentFailedEventDto);

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
      payment: toPaymentDto(updated),
    });

    this.logger.log(
      `webhook applied paymentId=${updated.id} providerRef=${verified.providerRef} status=${targetStatus}`,
    );

    return {
      data: {
        applied: true,
        idempotent: false,
        payment: toPaymentDto(updated),
      },
    };
  }

  /**
   * Idempotent consumer for booking.completed:
   * captured deposit Payment(s) → released + billing.deposit.released.
   * Never throws to NATS.
   */
  async onBookingCompleted(event: BookingStatusChangedEventDto): Promise<void> {
    try {
      if (event.toStatus && event.toStatus !== 'completed') {
        return;
      }

      const bookingId = event.booking?.id;
      if (!bookingId) {
        this.logger.warn(
          `booking.completed ${event.eventId}: missing booking.id; skip deposit release`,
        );
        return;
      }

      const deposits = await this.prisma.payment.findMany({
        where: {
          bookingId,
          kind: 'deposit',
          status: { in: ['captured', 'released'] },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (deposits.length === 0) {
        this.logger.log(
          `booking.completed ${event.eventId}: no deposit payment for booking ${bookingId}`,
        );
        return;
      }

      const customer = await this.lookupCustomer(event.booking.customerId);

      for (const payment of deposits) {
        await this.releaseDepositPayment(payment, event, customer);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to release deposit for booking.completed ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async releaseDepositPayment(
    payment: Payment,
    event: BookingStatusChangedEventDto,
    customer: PublicUserDto | null,
  ): Promise<void> {
    if (payment.status === 'released') {
      this.logger.log(
        `deposit already released paymentId=${payment.id} bookingId=${payment.bookingId} (idempotent)`,
      );
      return;
    }

    if (payment.status !== 'captured') {
      return;
    }

    const eventId = randomUUID();
    const occurredAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'released' },
      });

      const payload: DepositReleasedEventDto = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        correlationId: event.correlationId ?? event.eventId,
        payment: toPaymentDto(next),
        bookingId: next.bookingId,
        ...(event.booking.customerId
          ? { customerId: event.booking.customerId }
          : {}),
        ...(customer?.name ? { customerName: customer.name } : {}),
        ...(customer?.phone ? { customerPhone: customer.phone } : {}),
        ...(customer?.email ? { customerEmail: customer.email } : {}),
        ...(customer?.locale === 'en' || customer?.locale === 'fr'
          ? { locale: customer.locale }
          : {}),
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName: DOMAIN_EVENTS.billingDepositReleased,
          payload: payload as object,
        },
      });

      return { next, payload };
    });

    await this.publishOutbox(
      eventId,
      DOMAIN_EVENTS.billingDepositReleased,
      updated.payload,
    );

    this.logger.log(
      `deposit released paymentId=${updated.next.id} bookingId=${updated.next.bookingId}`,
    );
  }

  private async lookupCustomer(customerId: string | undefined): Promise<PublicUserDto | null> {
    if (!customerId) return null;
    try {
      return await firstValueFrom(
        this.nats
          .send<PublicUserDto>(NATS_PATTERNS.identity.me, { userId: customerId })
          .pipe(timeout(3000)),
      );
    } catch (error: unknown) {
      this.logger.warn(
        `identity.me failed for customerId=${customerId}; deposit.released will omit contact`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private async publishOutbox(
    eventId: string,
    eventName: string,
    payload: object,
  ): Promise<void> {
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

function toPaymentDto(row: Payment): PaymentDto {
  const provider = isPaymentProvider(row.provider) ? row.provider : 'manual';
  return {
    id: row.id,
    bookingId: row.bookingId,
    kind: row.kind,
    amountTnd: decimalToNumber(row.amountTnd),
    provider,
    providerRef: row.providerRef,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function decimalToNumber(value: Prisma.Decimal | number): number {
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

function isPaymentProvider(value: string): value is PaymentProviderLabel {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(value);
}

function normalizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      out[key.toLowerCase()] = value;
    }
  }
  return out;
}
