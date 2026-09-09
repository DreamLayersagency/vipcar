import {
  Body,
  Controller,
  Headers,
  HttpException,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateQuoteDto,
  CreateQuoteHttpDto,
  NATS_PATTERNS,
  type LocaleLabel,
  type QuoteDto,
  type VehicleModelDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { BOOKING_SERVICE } from '../booking.constants';
import { CATALOG_SERVICE } from '../catalog.constants';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(
    @Inject(BOOKING_SERVICE) private readonly booking: ClientProxy,
    @Inject(CATALOG_SERVICE) private readonly catalog: ClientProxy,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(
    @Body() body: CreateQuoteHttpDto,
    @Headers('accept-language') acceptLanguage?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const vehicleModelId = body.vehicleSlug
      ? await this.resolveVehicleModelId(body.vehicleSlug)
      : undefined;

    const dto: CreateQuoteDto = {
      service: body.service,
      vehicleModelId,
      pickupLabel: body.pickup,
      dropoffLabel: body.dropoff,
      startAt: body.startDate,
      endAt: body.endDate,
      passengers: body.passengers,
      duration: body.duration,
      flightNumber: body.flightNumber,
      notes: body.notes,
      customerName: body.name,
      customerPhone: body.phone,
      customerEmail: body.email,
      ...(user ? { customerId: user.userId } : {}),
      locale: body.locale ?? resolveLocale(acceptLanguage),
      channel: body.channel ?? 'web',
    };

    return this.sendBooking<{ data: QuoteDto }>(NATS_PATTERNS.booking.quote.create, dto);
  }

  private async resolveVehicleModelId(slug: string): Promise<string> {
    const vehicle = await this.sendCatalog<VehicleModelDto>(
      NATS_PATTERNS.catalog.vehicles.get,
      { slug },
    );
    return vehicle.id;
  }

  private async sendBooking<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.booking.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error, 'BOOKING_ERROR', 'Booking service error');
    }
  }

  private async sendCatalog<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.catalog.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error, 'CATALOG_ERROR', 'Catalog service error');
    }
  }
}

/** Accept-Language: en | fr | ar (default en). Honors primary tag only. */
function resolveLocale(header?: string): LocaleLabel {
  if (!header) return 'en';
  const primary = header.split(',')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('fr')) return 'fr';
  return primary.startsWith('ar') ? 'ar' : 'en';
}

function mapRpcError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : fallbackCode;
  const message = typeof rpc.message === 'string' ? rpc.message : fallbackMessage;
  return new HttpException({ error: { code, message, details: [] } }, status);
}

function unwrapRpc(error: unknown): { status?: number; code?: string; message?: string } {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as { status?: number; code?: string; message?: string };
    }
    return record as { status?: number; code?: string; message?: string };
  }
  return {};
}
