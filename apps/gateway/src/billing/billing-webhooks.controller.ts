import {
  Body,
  Controller,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import {
  HandleWebhookDto,
  NATS_PATTERNS,
  PAYMENT_PROVIDERS,
  type PaymentProviderLabel,
  type WebhookResultDto,
} from '@vipcar/contracts';
import { firstValueFrom, timeout } from 'rxjs';
import { BILLING_SERVICE } from '../billing.constants';

/**
 * Public PSP webhooks — no JWT. Auth is webhook secret + provider API verify in billing.
 */
@ApiTags('billing')
@Controller('billing/webhooks')
export class BillingWebhooksController {
  constructor(@Inject(BILLING_SERVICE) private readonly billing: ClientProxy) {}

  @Post(':provider')
  async handle(
    @Param('provider') providerParam: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
  ): Promise<{ data: WebhookResultDto }> {
    const provider = providerParam.trim().toLowerCase();
    if (!isPaymentProvider(provider)) {
      throw new HttpException(
        {
          error: {
            code: 'PROVIDER_UNKNOWN',
            message: `Unknown payment provider "${providerParam}"`,
            details: [{ allowed: [...PAYMENT_PROVIDERS] }],
          },
        },
        400,
      );
    }

    const dto: HandleWebhookDto = {
      provider,
      body: body && typeof body === 'object' ? body : {},
      headers: flattenHeaders(headers),
      query: flattenQuery(query),
    };

    try {
      return await firstValueFrom(
        this.billing
          .send<{ data: WebhookResultDto }>(
            NATS_PATTERNS.billing.webhook.handle,
            dto,
          )
          .pipe(timeout(20_000)),
      );
    } catch (error: unknown) {
      throw mapRpcError(error, 'BILLING_ERROR', 'Billing webhook error');
    }
  }
}

function isPaymentProvider(value: string): value is PaymentProviderLabel {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(value);
}

function flattenHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      out[key.toLowerCase()] = value;
    }
  }
  return out;
}

function flattenQuery(
  query: Record<string, string> | undefined,
): Record<string, string> {
  if (!query) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
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
