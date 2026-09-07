import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  ANALYTICS_EVENTS,
  CreateQuoteDto,
  DOMAIN_EVENTS,
  SetQuotePriceDto,
  type ChauffeurDurationLabel,
  type ListQuotesDto,
  type PaginationMetaDto,
  type QuoteCreatedEventDto,
  type QuoteDto,
  type QuotePricedEventDto,
} from '@vipcar/contracts';
import { randomUUID } from 'crypto';
import { defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';
import type { ChauffeurDuration, Quote, QuoteStatus } from '../../generated/prisma';
import { BOOKING_NATS } from '../booking.constants';
import { PrismaService } from '../prisma.service';
import { assertServiceTypePayload } from '../service-type.payload';

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

/** Booking statuses where ops may still overwrite the price snapshot. */
const PRE_PAYMENT_BOOKING_STATUSES = new Set([
  'quote_requested',
  'quoted',
  'awaiting_payment',
]);

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOOKING_NATS) private readonly nats: ClientProxy,
  ) {}

  async list(
    dto: ListQuotesDto = {},
  ): Promise<{ data: QuoteDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = {
      ...(dto.status ? { status: dto.status as QuoteStatus } : {}),
    };

    const [quotes, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes.map(toQuoteDto),
      meta: { page, limit, total },
    };
  }

  async create(dto: CreateQuoteDto): Promise<{ data: QuoteDto }> {
    this.validateCreate(dto);

    const startAt = parseDate(dto.startAt, 'startAt');
    const endAt = dto.endAt ? parseDate(dto.endAt, 'endAt') : null;
    // Persist type-specific fields only for the matching service.
    const duration =
      dto.service === 'chauffeur' && dto.duration
        ? DURATION_TO_PRISMA[dto.duration]
        : null;
    const flightNumber =
      dto.service === 'transfer'
        ? dto.flightNumber?.trim() || null
        : null;
    const eventId = randomUUID();
    const occurredAt = new Date();

    const quote = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          service: dto.service,
          status: 'received',
          vehicleModelId: dto.vehicleModelId ?? null,
          pickupLocationId: dto.pickupLocationId ?? null,
          pickupLabel: dto.pickupLabel ?? null,
          dropoffLocationId: dto.dropoffLocationId ?? null,
          dropoffLabel: dto.dropoffLabel ?? null,
          startAt,
          endAt,
          passengers: dto.passengers ?? null,
          duration,
          flightNumber,
          notes: dto.notes ?? null,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail ?? null,
          customerId: dto.customerId ?? null,
          language: dto.locale,
          channel: dto.channel,
          indicativePriceTnd: dto.indicativePriceTnd ?? null,
        },
      });

      const quoteDto = toQuoteDto(created);
      const eventPayload: QuoteCreatedEventDto = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        correlationId: dto.correlationId,
        quote: quoteDto,
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName: DOMAIN_EVENTS.bookingQuoteCreated,
          payload: eventPayload as object,
        },
      });

      return { created, eventPayload };
    });

    await this.publishOutbox(
      DOMAIN_EVENTS.bookingQuoteCreated,
      quote.eventPayload,
    );
    this.emitQuoteSubmitAnalytics(quote.created);

    return { data: toQuoteDto(quote.created) };
  }

  /**
   * Ops sets confirmedPriceTnd before payment. Moves quote to `quoted`,
   * syncs price onto any linked pre-payment booking, emits `booking.quote.priced`.
   */
  async setPrice(dto: SetQuotePriceDto): Promise<{ data: QuoteDto }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: dto.quoteId },
      include: { booking: true },
    });
    if (!quote) {
      throw new RpcException({
        code: 'QUOTE_NOT_FOUND',
        message: 'Quote not found',
        status: 404,
      });
    }

    if (quote.status === 'cancelled' || quote.status === 'expired') {
      throw new RpcException({
        code: 'QUOTE_NOT_PRICABLE',
        message: `Cannot set price on quote with status ${quote.status}`,
        status: 409,
        details: [{ status: quote.status }],
      });
    }

    if (quote.status === 'converted') {
      throw new RpcException({
        code: 'QUOTE_NOT_PRICABLE',
        message: 'Quote already converted to a confirmed booking',
        status: 409,
        details: [{ status: quote.status }],
      });
    }

    // Chauffeur quotes must already carry duration (snapshotted onto Booking later).
    if (quote.service === 'chauffeur' && !quote.duration) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'Chauffeur quote is missing duration (hourly | half-day | full-day)',
        status: 400,
        details: [{ field: 'duration' }],
      });
    }

    const eventId = randomUUID();
    const occurredAt = new Date();
    const nextQuoteStatus: QuoteStatus =
      quote.status === 'received' ? 'quoted' : quote.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.quote.update({
        where: { id: quote.id },
        data: {
          confirmedPriceTnd: dto.confirmedPriceTnd,
          status: nextQuoteStatus,
        },
      });

      // Keep billing price snapshot in sync before payment is captured.
      if (
        quote.booking &&
        PRE_PAYMENT_BOOKING_STATUSES.has(quote.booking.status)
      ) {
        await tx.booking.update({
          where: { id: quote.booking.id },
          data: {
            priceTnd: dto.confirmedPriceTnd,
            ...(quote.service === 'chauffeur' && quote.duration
              ? { duration: quote.duration }
              : {}),
            ...(quote.booking.status === 'quote_requested'
              ? { status: 'quoted' }
              : {}),
          },
        });
      }

      const quoteDto = toQuoteDto(next);
      const eventPayload: QuotePricedEventDto = {
        eventId,
        occurredAt: occurredAt.toISOString(),
        correlationId: dto.correlationId,
        quote: quoteDto,
      };

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventName: DOMAIN_EVENTS.bookingQuotePriced,
          payload: eventPayload as object,
        },
      });

      return { next, eventPayload };
    });

    await this.publishOutbox(
      DOMAIN_EVENTS.bookingQuotePriced,
      updated.eventPayload,
    );

    this.logger.log(
      `quote priced id=${quote.id} confirmedPriceTnd=${dto.confirmedPriceTnd} status=${updated.next.status}`,
    );

    return { data: toQuoteDto(updated.next) };
  }

  /** Server-side GA-compatible `quote_submit` (service, locale/language, channel). */
  private emitQuoteSubmitAnalytics(quote: Quote) {
    this.logger.log(
      JSON.stringify({
        analytics: true,
        event: ANALYTICS_EVENTS.quoteSubmit,
        service: quote.service,
        language: quote.language,
        locale: quote.language,
        channel: quote.channel,
        quoteId: quote.id,
      }),
    );
  }

  private validateCreate(dto: CreateQuoteDto) {
    // Contact-form leads only need name + contact + message (in notes).
    if (dto.channel === 'contact') {
      return;
    }

    if (!dto.pickupLocationId && !dto.pickupLabel) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'pickupLocationId or pickupLabel is required',
        status: 400,
      });
    }

    assertServiceTypePayload({
      service: dto.service,
      endAt: dto.endAt,
      duration: dto.duration,
      flightNumber: dto.flightNumber,
    });
  }

  private async publishOutbox(
    eventName: string,
    event: QuoteCreatedEventDto | QuotePricedEventDto,
  ) {
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

export function toQuoteDto(quote: Quote): QuoteDto {
  return {
    id: quote.id,
    service: quote.service,
    status: quote.status,
    vehicleModelId: quote.vehicleModelId,
    pickupLocationId: quote.pickupLocationId,
    pickupLabel: quote.pickupLabel,
    dropoffLocationId: quote.dropoffLocationId,
    dropoffLabel: quote.dropoffLabel,
    startAt: quote.startAt.toISOString(),
    endAt: quote.endAt ? quote.endAt.toISOString() : null,
    passengers: quote.passengers,
    duration: quote.duration ? DURATION_TO_LABEL[quote.duration] : null,
    flightNumber: quote.flightNumber,
    notes: quote.notes,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    customerId: quote.customerId,
    language: quote.language,
    channel: quote.channel,
    indicativePriceTnd:
      quote.indicativePriceTnd != null ? Number(quote.indicativePriceTnd) : null,
    confirmedPriceTnd:
      quote.confirmedPriceTnd != null ? Number(quote.confirmedPriceTnd) : null,
    createdAt: quote.createdAt.toISOString(),
  };
}
