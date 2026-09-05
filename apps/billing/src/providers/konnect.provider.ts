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
import { tndToMillimes } from './tnd-millimes';
import { assertWebhookSecret, readString } from './webhook-secret';

type KonnectInitResponse = {
  payUrl?: string;
  paymentRef?: string;
  message?: string;
  errors?: unknown;
};

type KonnectPaymentResponse = {
  payment?: {
    id?: string;
    status?: string;
    amount?: number;
    token?: string;
    orderId?: string;
    transactions?: Array<{ status?: string }>;
  };
  message?: string;
};

/**
 * Tunisia PSP adapter for Konnect Network.
 * Secrets: KONNECT_API_KEY, KONNECT_WALLET_ID (env only).
 * Webhook auth: optional BILLING_WEBHOOK_SECRET + GET payment by payment_ref.
 * @see https://docs.konnect.network/docs/en/api-integration/endpoints/initiate-payment
 */
@Injectable()
export class KonnectProvider implements PaymentProvider {
  readonly name = 'konnect' as const;
  private readonly logger = new Logger(KonnectProvider.name);
  private readonly apiKey: string;
  private readonly walletId: string;
  private readonly apiBaseUrl: string;
  private readonly webhookUrl: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = (this.config.get<string>('KONNECT_API_KEY') ?? '').trim();
    this.walletId = (this.config.get<string>('KONNECT_WALLET_ID') ?? '').trim();
    this.apiBaseUrl = (
      this.config.get<string>('KONNECT_API_BASE_URL') ??
      'https://api.preprod.konnect.network/api/v2'
    )
      .trim()
      .replace(/\/$/, '');
    const webhook = (this.config.get<string>('KONNECT_WEBHOOK_URL') ?? '').trim();
    this.webhookUrl = webhook || undefined;
    const secret = (this.config.get<string>('BILLING_WEBHOOK_SECRET') ?? '').trim();
    this.webhookSecret = secret || undefined;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    this.requireSecrets();

    const amountMillimes = tndToMillimes(input.amountTnd);
    const body: Record<string, unknown> = {
      receiverWalletId: this.walletId,
      token: 'TND',
      amount: amountMillimes,
      type: 'immediate',
      description: `VIPCAR ${input.kind} — booking ${input.bookingId}`,
      orderId: input.paymentId,
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 60,
      silentWebhook: true,
    };

    if (this.webhookUrl) {
      body.webhook = this.webhookUrl;
    }
    if (input.returnUrl) {
      body.successUrl = input.returnUrl;
      body.failUrl = input.returnUrl;
    }

    const url = `${this.apiBaseUrl}/payments/init-payment`;
    this.logger.log(
      `[konnect] init-payment paymentId=${input.paymentId} amountMillimes=${amountMillimes}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'network error';
      throw new RpcException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Konnect request failed: ${message}`,
        status: 502,
      });
    }

    const payload = (await response.json().catch(() => ({}))) as KonnectInitResponse;

    if (!response.ok || !payload.payUrl || !payload.paymentRef) {
      this.logger.warn(
        `[konnect] init-payment failed status=${response.status} body=${JSON.stringify(payload)}`,
      );
      throw new RpcException({
        code: 'PROVIDER_ERROR',
        message: payload.message ?? `Konnect init-payment failed (${response.status})`,
        status: 502,
        details: [{ provider: 'konnect', httpStatus: response.status }],
      });
    }

    return {
      providerRef: payload.paymentRef,
      checkoutUrl: payload.payUrl,
    };
  }

  async markPaid(_input: MarkPaidInput): Promise<MarkPaidResult> {
    throw new RpcException({
      code: 'PROVIDER_MARK_PAID_UNSUPPORTED',
      message: 'Konnect payments are captured via webhook, not markPaid',
      status: 400,
    });
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    assertWebhookSecret(this.webhookSecret, input.headers, input.query);
    this.requireSecrets();

    const providerRef =
      readString(input.body, 'payment_ref', 'paymentRef', 'paymentId', 'id') ??
      readString(
        input.query as unknown as Record<string, unknown>,
        'payment_ref',
        'paymentRef',
      );

    if (!providerRef) {
      throw new RpcException({
        code: 'WEBHOOK_PAYLOAD_INVALID',
        message: 'Konnect webhook requires payment_ref',
        status: 400,
      });
    }

    const payment = await this.fetchPayment(providerRef);
    const statusRaw = (payment.status ?? '').toLowerCase();
    const hasSuccessTx = (payment.transactions ?? []).some(
      (tx) => (tx.status ?? '').toLowerCase() === 'success',
    );

    if (statusRaw === 'completed' || hasSuccessTx) {
      return {
        providerRef: payment.id ?? providerRef,
        status: 'captured',
        paymentIdHint: payment.orderId,
      };
    }

    if (
      statusRaw === 'failed' ||
      statusRaw === 'expired' ||
      statusRaw === 'canceled' ||
      statusRaw === 'cancelled'
    ) {
      return {
        providerRef: payment.id ?? providerRef,
        status: 'failed',
        paymentIdHint: payment.orderId,
      };
    }

    return {
      providerRef: payment.id ?? providerRef,
      status: 'pending',
      paymentIdHint: payment.orderId,
    };
  }

  private async fetchPayment(paymentRef: string): Promise<NonNullable<KonnectPaymentResponse['payment']>> {
    const url = `${this.apiBaseUrl}/payments/${encodeURIComponent(paymentRef)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': this.apiKey },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'network error';
      throw new RpcException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Konnect get-payment failed: ${message}`,
        status: 502,
      });
    }

    const payload = (await response.json().catch(() => ({}))) as KonnectPaymentResponse;
    if (!response.ok || !payload.payment) {
      this.logger.warn(
        `[konnect] get-payment failed status=${response.status} body=${JSON.stringify(payload)}`,
      );
      throw new RpcException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: payload.message ?? 'Konnect payment could not be verified',
        status: 401,
        details: [{ provider: 'konnect', httpStatus: response.status }],
      });
    }

    return payload.payment;
  }

  private requireSecrets(): void {
    if (!this.apiKey || !this.walletId) {
      throw new RpcException({
        code: 'PROVIDER_MISCONFIGURED',
        message:
          'Konnect requires KONNECT_API_KEY and KONNECT_WALLET_ID in the environment',
        status: 500,
      });
    }
  }
}
