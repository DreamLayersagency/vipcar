import {
  Body,
  Controller,
  HttpException,
  Inject,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ConfirmBookingDto,
  ConfirmBookingHttpDto,
  ListQuotesDto,
  NATS_PATTERNS,
  PatchQuoteHttpDto,
  STAFF_ROLES,
  type BookingDto,
  type PaginationMetaDto,
  type QuoteDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsQuotesController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  @Get()
  @ApiOperation({
    summary: 'List quotes (staff inbox)',
    description:
      'Paginated quotes inbox with optional status filter. Roles: ops_agent, admin.',
  })
  async list(@Query() query: ListQuotesDto) {
    return this.send<{ data: QuoteDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.booking.quote.list,
      query,
    );
  }

  /**
   * Ops sets confirmedPriceTnd before payment (NATS `booking.quote.price`).
   * For chauffeur quotes, duration must already be on the quote and is
   * snapshotted onto Booking.priceTnd / Booking.duration for billing.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Set confirmed quote price',
    description:
      'Sets confirmedPriceTnd (TND), moves quote received → quoted when applicable, ' +
      'and syncs price onto any linked pre-payment booking.',
  })
  async setPrice(
    @Param('id', ParseUUIDPipe) quoteId: string,
    @Body() body: PatchQuoteHttpDto,
  ) {
    return this.send<{ data: QuoteDto }>(NATS_PATTERNS.booking.quote.price, {
      quoteId,
      confirmedPriceTnd: body.confirmedPriceTnd,
    });
  }

  /**
   * Quote-first confirm: create booking from quote at awaiting_payment, then confirm.
   * Prefer this from the quotes inbox when no booking id exists yet.
   */
  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm quote → booking',
    description:
      'Creates a booking from the quote (if needed) at awaiting_payment, then confirms. ' +
      'Requires confirmedPriceTnd (or priceTnd in body) and unitId for the fleet calendar block. ' +
      'customerId required when the quote has no linked customer.',
  })
  async confirm(
    @Param('id', ParseUUIDPipe) quoteId: string,
    @Body() body: ConfirmBookingHttpDto = {},
  ) {
    const dto: ConfirmBookingDto = {
      quoteId,
      ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
      ...(body.unitId !== undefined ? { unitId: body.unitId } : {}),
      ...(body.priceTnd !== undefined ? { priceTnd: body.priceTnd } : {}),
      ...(body.depositTnd !== undefined ? { depositTnd: body.depositTnd } : {}),
    };
    return this.send<{ data: BookingDto }>(NATS_PATTERNS.booking.confirm, dto);
  }

  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.booking.send<T>(pattern, payload).pipe(timeout(10_000)),
      );
    } catch (error: unknown) {
      throw mapBookingError(error);
    }
  }
}

function mapBookingError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const rawMessage =
    typeof rpc.message === 'string' ? rpc.message : 'Booking service error';
  const unavailable = isUnavailableMessage(rawMessage);
  const status = unavailable ? 503 : typeof rpc.status === 'number' ? rpc.status : 502;
  const code = unavailable
    ? 'SERVICE_UNAVAILABLE'
    : typeof rpc.code === 'string'
      ? rpc.code
      : 'BOOKING_ERROR';
  const message = unavailable
    ? 'The booking service is temporarily unavailable. Please try again in a moment.'
    : rawMessage;
  const details = Array.isArray(rpc.details) ? rpc.details : [];
  return new HttpException({ error: { code, message, details } }, status);
}

function isUnavailableMessage(message: string): boolean {
  return /no subscribers listening|empty response/i.test(message);
}

function unwrapRpc(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown[];
} {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as {
        status?: number;
        code?: string;
        message?: string;
        details?: unknown[];
      };
    }
    return record as {
      status?: number;
      code?: string;
      message?: string;
      details?: unknown[];
    };
  }
  return {};
}
