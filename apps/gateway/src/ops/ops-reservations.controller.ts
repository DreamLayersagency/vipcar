import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AssignReservationUnitHttpDto,
  ConfirmBookingHttpDto,
  ListReservationsDto,
  NATS_PATTERNS,
  PatchQuoteHttpDto,
  STAFF_ROLES,
  UpdateBookingStatusDto,
  UpdateReservationStatusHttpDto,
  type BookingDto,
  type PaginationMetaDto,
  type QuoteDto,
  type ReservationDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsReservationsController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  @Get()
  @ApiOperation({
    summary: 'List staff reservations',
    description:
      'Unified quote and booking inbox. The reservation id is the originating quote id. ' +
      'Supports status, service, channel, date range and free-text search.',
  })
  async list(@Query() query: ListReservationsDto) {
    return this.send<{ data: ReservationDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.booking.ops.reservationsList,
      query,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get staff reservation detail',
    description:
      'Resolves by the canonical quote id, or by a linked booking id for operational convenience.',
  })
  async get(@Param('id', ParseUUIDPipe) reservationId: string) {
    return this.send<{ data: ReservationDto }>(
      NATS_PATTERNS.booking.ops.reservationGet,
      { reservationId },
    );
  }

  @Patch(':id/price')
  @ApiOperation({
    summary: 'Set reservation price',
    description:
      'Uses the existing quote pricing flow and keeps any pre-payment booking snapshot in sync.',
  })
  async setPrice(
    @Param('id', ParseUUIDPipe) reservationId: string,
    @Body() body: PatchQuoteHttpDto,
  ) {
    await this.send<{ data: QuoteDto }>(
      NATS_PATTERNS.booking.quote.price,
      { quoteId: reservationId, confirmedPriceTnd: body.confirmedPriceTnd },
    );
    return this.get(reservationId);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm reservation',
    description:
      'Creates the booking from the quote when needed, then uses the existing confirmation saga to block fleet time.',
  })
  async confirm(
    @Param('id', ParseUUIDPipe) reservationId: string,
    @Body() body: ConfirmBookingHttpDto = {},
  ) {
    await this.send<{ data: BookingDto }>(
      NATS_PATTERNS.booking.confirm,
      {
        quoteId: reservationId,
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.unitId !== undefined ? { unitId: body.unitId } : {}),
        ...(body.priceTnd !== undefined ? { priceTnd: body.priceTnd } : {}),
        ...(body.depositTnd !== undefined ? { depositTnd: body.depositTnd } : {}),
      },
    );
    return this.get(reservationId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update reservation status',
    description:
      'Delegates transition validation to the booking service state machine; illegal transitions return 409.',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationStatusHttpDto,
  ) {
    const dto: UpdateBookingStatusDto = {
      quoteId: reservationId,
      status: body.status,
      ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
      ...(body.unitId !== undefined ? { unitId: body.unitId } : {}),
      ...(body.priceTnd !== undefined ? { priceTnd: body.priceTnd } : {}),
      ...(body.depositTnd !== undefined ? { depositTnd: body.depositTnd } : {}),
    };
    await this.send<{ data: BookingDto }>(
      NATS_PATTERNS.booking.status.update,
      dto,
    );
    return this.get(reservationId);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Assign fleet unit',
    description:
      'Assigns a unit to a pre-confirmation booking. Confirmation remains responsible for availability and calendar blocking.',
  })
  async assignUnit(
    @Param('id', ParseUUIDPipe) reservationId: string,
    @Body() body: AssignReservationUnitHttpDto,
  ) {
    return this.send<{ data: ReservationDto }>(
      NATS_PATTERNS.booking.ops.reservationAssign,
      { quoteId: reservationId, unitId: body.unitId },
    );
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
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'BOOKING_ERROR';
  const message =
    typeof rpc.message === 'string' ? rpc.message : 'Booking service error';
  const details = Array.isArray(rpc.details) ? rpc.details : [];
  return new HttpException({ error: { code, message, details } }, status);
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
