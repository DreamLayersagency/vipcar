import {
  Body,
  Controller,
  Headers,
  HttpException,
  Inject,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateContactHttpDto,
  CreateQuoteDto,
  NATS_PATTERNS,
  type LocaleLabel,
  type QuoteDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { BOOKING_SERVICE } from '../booking.constants';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(@Inject(BOOKING_SERVICE) private readonly booking: ClientProxy) {}

  @Post()
  async create(
    @Body() body: CreateContactHttpDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const contact = body.contact.trim();
    const email = contact.includes('@') ? contact : undefined;

    const dto: CreateQuoteDto = {
      // Placeholder service — contact form has no trip type; ops use channel=contact.
      service: 'transfer',
      startAt: new Date().toISOString(),
      notes: body.message.trim(),
      customerName: body.name.trim(),
      customerPhone: contact,
      customerEmail: email,
      locale: body.locale ?? resolveLocale(acceptLanguage),
      channel: 'contact',
    };

    return this.sendBooking<{ data: QuoteDto }>(
      NATS_PATTERNS.booking.quote.create,
      dto,
    );
  }

  private async sendBooking<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        this.booking.send<T>(pattern, payload).pipe(timeout(5000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error);
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

function mapRpcError(error: unknown): HttpException {
  const rpc = unwrapRpc(error);
  const status = typeof rpc.status === 'number' ? rpc.status : 502;
  const code = typeof rpc.code === 'string' ? rpc.code : 'BOOKING_ERROR';
  const message =
    typeof rpc.message === 'string' ? rpc.message : 'Booking service error';
  return new HttpException({ error: { code, message, details: [] } }, status);
}

function unwrapRpc(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
} {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'object' && record.error !== null) {
      return record.error as {
        status?: number;
        code?: string;
        message?: string;
      };
    }
    return record as { status?: number; code?: string; message?: string };
  }
  return {};
}
