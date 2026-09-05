import {
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CheckoutHttpDto,
  CreateCheckoutDto,
  NATS_PATTERNS,
  type BookingDto,
  type CheckoutResultDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BILLING_SERVICE } from '../billing.constants';
import { BOOKING_SERVICE } from '../booking.constants';

const PAYABLE_STATUSES = new Set(['quoted', 'awaiting_payment']);

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class BillingController {
  constructor(
    @Inject(BILLING_SERVICE) private readonly billing: ClientProxy,
    @Inject(BOOKING_SERVICE) private readonly booking: ClientProxy,
  ) {}

  /**
   * Start deposit checkout for a booking. Moves status to `awaiting_payment`
   * and returns a PSP checkout URL or manual payment instructions.
   */
  @Post('checkout')
  async checkout(
    @CurrentUser() user: RequestUser,
    @Body() body: CheckoutHttpDto,
  ): Promise<{ data: CheckoutResultDto }> {
    const { data: booking } = await this.sendBooking<{ data: BookingDto }>(
      NATS_PATTERNS.booking.get,
      { bookingId: body.bookingId },
    );

    if (booking.customerId !== user.userId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the booking owner can start checkout',
          details: [],
        },
      });
    }

    if (!PAYABLE_STATUSES.has(booking.status)) {
      throw new HttpException(
        {
          error: {
            code: 'BOOKING_NOT_PAYABLE',
            message: `Cannot start checkout from booking status ${booking.status}`,
            details: [{ status: booking.status }],
          },
        },
        409,
      );
    }

    if (booking.status !== 'awaiting_payment') {
      await this.sendBooking<{ data: BookingDto }>(
        NATS_PATTERNS.booking.status.update,
        {
          bookingId: booking.id,
          status: 'awaiting_payment',
        },
      );
    }

    const dto: CreateCheckoutDto = {
      bookingId: booking.id,
      kind: 'deposit',
      amountTnd: booking.depositTnd,
      ...(body.provider !== undefined ? { provider: body.provider } : {}),
      ...(body.returnUrl !== undefined ? { returnUrl: body.returnUrl } : {}),
    };

    return this.sendBilling<{ data: CheckoutResultDto }>(
      NATS_PATTERNS.billing.checkout.create,
      dto,
    );
  }

  private async sendBooking<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.booking.send<T>(pattern, payload).pipe(timeout(10_000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error, 'BOOKING_ERROR', 'Booking service error');
    }
  }

  private async sendBilling<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.billing.send<T>(pattern, payload).pipe(timeout(15_000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error, 'BILLING_ERROR', 'Billing service error');
    }
  }
}

function mapRpcError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : fallbackCode;
  const message =
    typeof rpc.message === 'string' ? rpc.message : fallbackMessage;
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
