import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DOMAIN_EVENTS,
  type DepositReleasedEventDto,
  type DispatchAssignedEventDto,
  type DispatchTripStatusEventDto,
  type LocaleLabel,
  type QuoteCreatedEventDto,
} from '@vipcar/contracts';
import { Prisma } from '../../generated/prisma';
import type { DeliveryChannel, DeliveryLog } from '../../generated/prisma';
import { MockEmailAdapter } from '../adapters/mock-email.adapter';
import { MockWhatsAppAdapter } from '../adapters/mock-whatsapp.adapter';
import type { NotificationAdapter } from '../adapters/notification.adapter';
import {
  DEPOSIT_RELEASED_TEMPLATE,
  DISPATCH_ASSIGNED_TEMPLATE,
  DISPATCH_TRIP_STATUS_TEMPLATE,
  MAX_DELIVERY_ATTEMPTS,
  QUOTE_CREATED_TEMPLATE,
  RETRY_BASE_MS,
  RETRY_MAX_MS,
} from '../notify.constants';
import { PrismaService } from '../prisma.service';
import { renderDepositReleased } from '../templates/deposit-released';
import {
  renderDispatchAssigned,
  renderTripStatus,
} from '../templates/dispatch-trip';
import { renderQuoteCreated } from '../templates/quote-created';

type QuoteCreatedPayload = {
  kind: 'quote_created';
  quote: QuoteCreatedEventDto['quote'];
  correlationId?: string;
  occurredAt: string;
};

type DepositReleasedPayload = {
  kind: 'deposit_released';
  event: DepositReleasedEventDto;
};

type DispatchAssignedPayload = {
  kind: 'dispatch_assigned';
  event: DispatchAssignedEventDto;
};

type TripStatusPayload = {
  kind: 'dispatch_trip_status';
  event: DispatchTripStatusEventDto;
};

type DeliveryPayload =
  | QuoteCreatedPayload
  | DepositReleasedPayload
  | DispatchAssignedPayload
  | TripStatusPayload;

type CustomerContact = {
  customerPhone?: string | null;
  customerEmail?: string | null;
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly adapters: Map<DeliveryChannel, NotificationAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    whatsapp: MockWhatsAppAdapter,
    email: MockEmailAdapter,
  ) {
    this.adapters = new Map<DeliveryChannel, NotificationAdapter>([
      ['whatsapp', whatsapp],
      ['email', email],
    ]);
  }

  /**
   * Idempotent enqueue for booking.quote.created.
   * Persists delivery rows first, then attempts send — never throws to NATS.
   */
  async onQuoteCreated(event: QuoteCreatedEventDto): Promise<void> {
    try {
      const channels = this.enabledChannels();
      if (channels.length === 0) {
        this.logger.warn('No notify channels enabled; skipping enqueue');
        return;
      }

      const payload: QuoteCreatedPayload = {
        kind: 'quote_created',
        quote: event.quote,
        correlationId: event.correlationId,
        occurredAt: event.occurredAt,
      };

      const created: DeliveryLog[] = [];
      for (const channel of channels) {
        const to = this.opsAddress(channel);
        if (!to) {
          this.logger.warn(`Missing ops address for channel=${channel}; skip`);
          continue;
        }

        try {
          const row = await this.prisma.deliveryLog.create({
            data: {
              eventId: event.eventId,
              eventName: DOMAIN_EVENTS.bookingQuoteCreated,
              channel,
              to,
              template: QUOTE_CREATED_TEMPLATE,
              payload: payload as unknown as Prisma.InputJsonValue,
              status: 'queued',
              nextAttemptAt: new Date(),
            },
          });
          created.push(row);
        } catch (error: unknown) {
          if (this.isUniqueViolation(error)) {
            this.logger.debug(
              `Delivery already enqueued eventId=${event.eventId} channel=${channel}`,
            );
            continue;
          }
          throw error;
        }
      }

      for (const row of created) {
        await this.processOne(row.id);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue quote.created ${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Idempotent enqueue for billing.deposit.released → customer.
   * Skips channels without a customer address (may message when contact known).
   */
  async onDepositReleased(event: DepositReleasedEventDto): Promise<void> {
    await this.enqueueCustomerEvent({
      eventId: event.eventId,
      eventName: DOMAIN_EVENTS.billingDepositReleased,
      template: DEPOSIT_RELEASED_TEMPLATE,
      contact: event,
      payload: { kind: 'deposit_released', event } satisfies DepositReleasedPayload,
      logLabel: 'deposit.released',
    });
  }

  /** Idempotent enqueue for dispatch.assigned → customer. */
  async onDispatchAssigned(event: DispatchAssignedEventDto): Promise<void> {
    await this.enqueueCustomerEvent({
      eventId: event.eventId,
      eventName: DOMAIN_EVENTS.dispatchAssigned,
      template: DISPATCH_ASSIGNED_TEMPLATE,
      contact: event,
      payload: { kind: 'dispatch_assigned', event } satisfies DispatchAssignedPayload,
      logLabel: 'dispatch.assigned',
    });
  }

  /** Idempotent enqueue for dispatch.trip.status.changed → customer. */
  async onTripStatusChanged(event: DispatchTripStatusEventDto): Promise<void> {
    await this.enqueueCustomerEvent({
      eventId: event.eventId,
      eventName: DOMAIN_EVENTS.dispatchTripStatus,
      template: DISPATCH_TRIP_STATUS_TEMPLATE,
      contact: event,
      payload: {
        kind: 'dispatch_trip_status',
        event,
      } satisfies TripStatusPayload,
      logLabel: `dispatch.trip.status.changed(${event.status})`,
    });
  }

  private async enqueueCustomerEvent(args: {
    eventId: string;
    eventName: string;
    template: string;
    contact: CustomerContact;
    payload: DeliveryPayload;
    logLabel: string;
  }): Promise<void> {
    try {
      const channels = this.enabledChannels();
      if (channels.length === 0) {
        this.logger.warn(`No notify channels enabled; skipping ${args.logLabel}`);
        return;
      }

      const created: DeliveryLog[] = [];
      for (const channel of channels) {
        const to = this.customerAddress(channel, args.contact);
        if (!to) {
          this.logger.log(
            `${args.logLabel} ${args.eventId}: no customer ${channel} address; skip channel`,
          );
          continue;
        }

        try {
          const row = await this.prisma.deliveryLog.create({
            data: {
              eventId: args.eventId,
              eventName: args.eventName,
              channel,
              to,
              template: args.template,
              payload: args.payload as unknown as Prisma.InputJsonValue,
              status: 'queued',
              nextAttemptAt: new Date(),
            },
          });
          created.push(row);
        } catch (error: unknown) {
          if (this.isUniqueViolation(error)) {
            this.logger.debug(
              `Delivery already enqueued eventId=${args.eventId} channel=${channel}`,
            );
            continue;
          }
          throw error;
        }
      }

      for (const row of created) {
        await this.processOne(row.id);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue ${args.logLabel} ${args.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async processDue(limit = 20): Promise<number> {
    const now = new Date();
    const due = await this.prisma.deliveryLog.findMany({
      where: {
        status: { in: ['queued', 'failed'] },
        attempts: { lt: MAX_DELIVERY_ATTEMPTS },
        nextAttemptAt: { lte: now },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
    });

    for (const row of due) {
      await this.processOne(row.id);
    }
    return due.length;
  }

  async processOne(id: string): Promise<void> {
    const row = await this.prisma.deliveryLog.findUnique({ where: { id } });
    if (!row) return;
    if (row.status === 'sent') return;
    if (row.attempts >= MAX_DELIVERY_ATTEMPTS) return;
    if (row.nextAttemptAt > new Date() && row.status === 'failed') return;

    const adapter = this.adapters.get(row.channel);
    if (!adapter) {
      await this.markFailed(row, `No adapter for channel=${row.channel}`, false);
      return;
    }

    const rendered = this.renderRow(row);
    if (!rendered) {
      await this.markFailed(row, `Unknown template=${row.template}`, false);
      return;
    }

    try {
      await adapter.send({
        to: row.to,
        subject: rendered.subject,
        body: rendered.body,
        template: row.template,
        locale: rendered.locale,
      });

      await this.prisma.deliveryLog.update({
        where: { id: row.id },
        data: {
          status: 'sent',
          error: null,
          attempts: row.attempts + 1,
          sentAt: new Date(),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markFailed(row, message, true);
    }
  }

  private renderRow(
    row: DeliveryLog,
  ): { subject: string; body: string; locale: string } | null {
    const raw = row.payload as unknown as DeliveryPayload | QuoteCreatedEventDto['quote'];

    // Backward-compatible: older quote payloads stored { quote, ... } without kind.
    if (row.template === QUOTE_CREATED_TEMPLATE) {
      const payload = normalizeQuotePayload(raw);
      if (!payload) return null;
      const locale = payload.quote.language;
      const rendered = renderQuoteCreated(payload.quote, locale);
      return { ...rendered, locale };
    }

    if (row.template === DEPOSIT_RELEASED_TEMPLATE) {
      const payload = raw as DepositReleasedPayload;
      if (!payload?.event?.payment) return null;
      const locale: LocaleLabel =
        payload.event.locale === 'fr' || payload.event.locale === 'en'
          ? payload.event.locale
          : 'en';
      const rendered = renderDepositReleased(payload.event, locale);
      return { ...rendered, locale };
    }

    if (row.template === DISPATCH_ASSIGNED_TEMPLATE) {
      const payload = raw as DispatchAssignedPayload;
      if (!payload?.event?.bookingId) return null;
      const locale = localeFromEvent(payload.event.locale);
      const rendered = renderDispatchAssigned(payload.event, locale);
      return { ...rendered, locale };
    }

    if (row.template === DISPATCH_TRIP_STATUS_TEMPLATE) {
      const payload = raw as TripStatusPayload;
      if (!payload?.event?.bookingId || !payload.event.status) return null;
      const locale = localeFromEvent(payload.event.locale);
      const rendered = renderTripStatus(payload.event, locale);
      return { ...rendered, locale };
    }

    return null;
  }

  private async markFailed(
    row: DeliveryLog,
    error: string,
    scheduleRetry: boolean,
  ): Promise<void> {
    const attempts = row.attempts + 1;
    const canRetry = scheduleRetry && attempts < MAX_DELIVERY_ATTEMPTS;
    const delay = Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);

    await this.prisma.deliveryLog.update({
      where: { id: row.id },
      data: {
        status: 'failed',
        error: error.slice(0, 2000),
        attempts,
        nextAttemptAt: canRetry ? new Date(Date.now() + delay) : row.nextAttemptAt,
      },
    });

    this.logger.warn(
      `Delivery ${row.id} failed (attempt ${attempts}/${MAX_DELIVERY_ATTEMPTS}): ${error}`,
    );
  }

  private enabledChannels(): DeliveryChannel[] {
    const raw = this.config.get<string>('NOTIFY_CHANNELS', 'whatsapp,email');
    const allowed = new Set(['whatsapp', 'email']);
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is DeliveryChannel => allowed.has(s));
  }

  private opsAddress(channel: DeliveryChannel): string | undefined {
    if (channel === 'whatsapp') {
      return this.config.get<string>('OPS_WHATSAPP_TO') ?? undefined;
    }
    return this.config.get<string>('OPS_EMAIL_TO') ?? undefined;
  }

  private customerAddress(
    channel: DeliveryChannel,
    event: CustomerContact,
  ): string | undefined {
    if (channel === 'whatsapp') {
      return event.customerPhone?.trim() || undefined;
    }
    return event.customerEmail?.trim() || undefined;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }
}

function localeFromEvent(locale: string | undefined): LocaleLabel {
  return locale === 'fr' || locale === 'en' ? locale : 'en';
}

function normalizeQuotePayload(
  raw: unknown,
): QuoteCreatedPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (obj.kind === 'quote_created' && obj.quote && typeof obj.quote === 'object') {
    return obj as unknown as QuoteCreatedPayload;
  }

  // Legacy shape: { quote, correlationId?, occurredAt? }
  if (obj.quote && typeof obj.quote === 'object') {
    return {
      kind: 'quote_created',
      quote: obj.quote as QuoteCreatedEventDto['quote'],
      correlationId:
        typeof obj.correlationId === 'string' ? obj.correlationId : undefined,
      occurredAt: typeof obj.occurredAt === 'string' ? obj.occurredAt : '',
    };
  }

  return null;
}
