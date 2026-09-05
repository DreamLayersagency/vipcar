import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  MarkPaidInput,
  MarkPaidResult,
  PaymentProvider,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from './payment-provider';
import { assertWebhookSecret, readString } from './webhook-secret';

/**
 * Optional Stripe stub — no real Stripe API calls.
 * Set BILLING_DEFAULT_PROVIDER=stripe for local/dev checkout URL shape only.
 * Webhook: HMAC-SHA256 of raw JSON body with STRIPE_WEBHOOK_SECRET
 * (header `stripe-signature` or `x-vipcar-signature`), or BILLING_WEBHOOK_SECRET.
 * Production Tunisia payments use Konnect or Flouci.
 */
@Injectable()
export class StripeStubProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly logger = new Logger(StripeStubProvider.name);
  private readonly secretKeyPresent: boolean;
  private readonly webhookSecret: string | undefined;
  private readonly billingWebhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.secretKeyPresent = Boolean(
      (this.config.get<string>('STRIPE_SECRET_KEY') ?? '').trim(),
    );
    const stripeWh = (this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '').trim();
    this.webhookSecret = stripeWh || undefined;
    const billingWh = (this.config.get<string>('BILLING_WEBHOOK_SECRET') ?? '').trim();
    this.billingWebhookSecret = billingWh || undefined;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.secretKeyPresent) {
      this.logger.warn(
        '[stripe-stub] STRIPE_SECRET_KEY unset; returning stub checkout without live Stripe',
      );
    }

    const providerRef = `stripe-stub-${input.paymentId}`;
    const amount = input.amountTnd.toFixed(3);
    const checkoutUrl = input.returnUrl
      ? appendQuery(input.returnUrl, {
          stub: 'stripe',
          paymentId: input.paymentId,
          providerRef,
        })
      : `https://checkout.stripe.com/c/pay/stub_${input.paymentId}`;

    this.logger.log(
      `[stripe-stub] checkout paymentId=${input.paymentId} bookingId=${input.bookingId} amount=${amount}`,
    );

    return {
      providerRef,
      checkoutUrl,
      instructions:
        'Stripe stub only — no charge was created. Use Konnect or Flouci for Tunisia production payments.',
    };
  }

  async markPaid(_input: MarkPaidInput): Promise<MarkPaidResult> {
    throw new RpcException({
      code: 'PROVIDER_MARK_PAID_UNSUPPORTED',
      message: 'Stripe stub does not support markPaid; use webhooks or a real PSP',
      status: 400,
    });
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const sigHeader =
      input.headers['stripe-signature'] ??
      input.headers['x-vipcar-signature'] ??
      '';

    if (this.webhookSecret) {
      const rawBody = JSON.stringify(input.body);
      if (!verifyHmacHex(rawBody, this.webhookSecret, sigHeader)) {
        throw new RpcException({
          code: 'WEBHOOK_SIGNATURE_INVALID',
          message: 'Invalid Stripe webhook signature',
          status: 401,
        });
      }
    } else {
      assertWebhookSecret(this.billingWebhookSecret, input.headers, input.query);
    }

    const dataObject =
      typeof input.body.data === 'object' &&
      input.body.data !== null &&
      typeof (input.body.data as Record<string, unknown>).object === 'object'
        ? ((input.body.data as Record<string, unknown>).object as Record<string, unknown>)
        : undefined;

    const providerRef =
      readString(input.body, 'providerRef', 'provider_ref', 'id') ??
      readString(dataObject, 'id') ??
      readString(input.query as unknown as Record<string, unknown>, 'providerRef');

    if (!providerRef) {
      throw new RpcException({
        code: 'WEBHOOK_PAYLOAD_INVALID',
        message: 'Stripe webhook requires providerRef / payment id',
        status: 400,
      });
    }

    const type = readString(input.body, 'type')?.toLowerCase() ?? '';
    const statusRaw = (
      readString(input.body, 'status') ??
      readString(dataObject, 'status') ??
      ''
    ).toLowerCase();

    if (
      type.includes('failed') ||
      statusRaw === 'failed' ||
      statusRaw === 'canceled' ||
      statusRaw === 'cancelled'
    ) {
      return { providerRef, status: 'failed' };
    }

    if (
      type.includes('succeeded') ||
      type.includes('captured') ||
      statusRaw === 'succeeded' ||
      statusRaw === 'captured' ||
      statusRaw === 'paid' ||
      !type
    ) {
      const meta =
        dataObject && typeof dataObject.metadata === 'object' && dataObject.metadata !== null
          ? (dataObject.metadata as Record<string, unknown>)
          : undefined;
      return {
        providerRef,
        status: 'captured',
        paymentIdHint: readString(input.body, 'paymentId') ?? readString(meta, 'paymentId'),
      };
    }

    return { providerRef, status: 'pending' };
  }
}

function appendQuery(baseUrl: string, params: Record<string, string>): string {
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${baseUrl}${sep}${qs}`;
  }
}

function verifyHmacHex(payload: string, secret: string, header: string): boolean {
  const provided = header.replace(/^sha256=/i, '').trim();
  if (!provided) return false;
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
