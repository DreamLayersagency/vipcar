import {
  Controller,
  Get,
  HttpException,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ListMyBookingsDto,
  ListMyBookingsQueryDto,
  NATS_PATTERNS,
  type BookingDto,
  type PaginationMetaDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class MeBookingsController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  /** Customer portal: own bookings only (customerId from JWT). */
  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListMyBookingsQueryDto,
  ) {
    const dto: ListMyBookingsDto = {
      customerId: user.userId,
      page: query.page,
      limit: query.limit,
    };
    return this.send<{ data: BookingDto[]; meta: PaginationMetaDto }>(
      NATS_PATTERNS.booking.list,
      dto,
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
