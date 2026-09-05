import {
  Body,
  Controller,
  HttpException,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
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
  NATS_PATTERNS,
  STAFF_ROLES,
  type BookingDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class OpsBookingsController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  /**
   * Manual ops confirm: awaiting_payment → confirmed (NATS `booking.confirm`).
   * Requires unitId on the booking (or in the body) for the fleet calendar block.
   */
  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm a booking',
    description:
      'Staff manual confirm after payment offline or ops override. ' +
      'Transitions awaiting_payment → confirmed and blocks fleet calendar. ' +
      'Pass unitId when the booking has none.',
  })
  async confirm(
    @Param('id', ParseUUIDPipe) bookingId: string,
    @Body() body: ConfirmBookingHttpDto = {},
  ) {
    const dto: ConfirmBookingDto = {
      bookingId,
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
