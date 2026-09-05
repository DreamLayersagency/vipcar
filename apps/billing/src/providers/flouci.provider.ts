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

type FlouciGenerateResponse = {
  result?: {
    success?: boolean;
    payment_id?: string;
    link?: string;
    message?: string;
    status?: number;
  };
  code?: number;
};

type FlouciVerifyResponse = {
  success?: boolean;
  result?: {
    status?: string;
    amount?: number;
    developer_tracking_id?: string | null;
    message?: string;
  };
  status_code?: number;
};

/**
 * Tunisia PSP adapter for Flouci.
 * Secrets: FLOUCI_PUBLIC_KEY, FLOUCI_PRIVATE_KEY (env only).
 * Webhook auth: optional BILLING_WEBHOOK_SECRET + verify_payment API.
 * @see https://docs.flouci.com/api-reference/generate-transaction
 */
@Injectable()
export class FlouciProvider implements PaymentProvider {
  readonly name = 'flouci' as const;
  private readonly logger = new Logger(FlouciProvider.name);
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly apiBaseUrl: string;
  private readonly webhookUrl: string | undefined;
  private readonly defaultSuccessUrl: string | undefined;
  private readonly defaultFailUrl: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.publicKey = (this.config.get<string>('FLOUCI_PUBLIC_KEY') ?? '').trim();
    this.privateKey = (this.config.get<string>('FLOUCI_PRIVATE_KEY') ?? '').trim();
    this.apiBaseUrl = (
      this.config.get<string>('FLOUCI_API_BASE_URL') ?? 'https://developers.flouci.com'
    )
      .trim()
      .replace(/\/$/, '');
    const webhook = (this.config.get<string>('FLOUCI_WEBHOOK_URL') ?? '').trim();
    this.webhookUrl = webhook || undefined;
    const success = (this.config.get<string>('FLOUCI_SUCCESS_URL') ?? '').trim();
    const fail = (this.config.get<string>('FLOUCI_FAIL_URL') ?? '').trim();
    this.defaultSuccessUrl = success || undefined;
    this.defaultFailUrl = fail || undefined;
    const secret = (this.config.get<string>('BILLING_WEBHOOK_SECRET') ?? '').trim();
    this.webhookSecret = secret || undefined;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    this.requireSecrets();

    const successLink = input.returnUrl ?? this.defaultSuccessUrl;
    const failLink = input.returnUrl ?? this.defaultFailUrl ?? successLink;
    if (!successLink || !failLink) {
      throw new RpcException({
        code: 'PROVIDER_MISCONFIGURED',
        message:
          'Flouci requires returnUrl on checkout or FLOUCI_SUCCESS_URL / FLOUCI_FAIL_URL in env',
        status: 400,
      });
    }

    const amountMillimes = tndToMillimes(input.amountTnd);
    const body: Record<string, unknown> = {
      amount: amountMillimes,
      developer_tracking_id: input.paymentId,
      accept_card: true,
      success_link: successLink,
      fail_link: failLink,
    };
    if (this.webhookUrl) {
      body.webhook = this.webhookUrl;
    }

    const url = `${this.apiBaseUrl}/api/v2/generate_payment`;
    this.logger.log(
      `[flouci] generate_payment paymentId=${input.paymentId} amountMillimes=${amountMillimes}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}:${this.privateKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'network error';
      throw new RpcException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Flouci request failed: ${message}`,
        status: 502,
      });
    }

    const payload = (await response.json().catch(() => ({}))) as FlouciGenerateResponse;
    const result = payload.result;
    const paymentId = result?.payment_id;
    const link = result?.link;

    if (!response.ok || !paymentId || !link) {
      this.logger.warn(
        `[flouci] generate_payment failed status=${response.status} body=${JSON.stringify(payload)}`,
      );
      throw new RpcException({
        code: 'PROVIDER_ERROR',
        message: result?.message ?? `Flouci generate_payment failed (${response.status})`,
        status: 502,
        details: [{ provider: 'flouci', httpStatus: response.status }],
      });
    }

    return {
      providerRef: paymentId,
      checkoutUrl: link,
    };
  }

  async markPaid(_input: MarkPaidInput): Promise<MarkPaidResult> {
    throw new RpcException({
      code: 'PROVIDER_MARK_PAID_UNSUPPORTED',
      message: 'Flouci payments are captured via webhook, not markPaid',
      status: 400,
    });
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    assertWebhookSecret(this.webhookSecret, input.headers, input.query);
    this.requireSecrets();

    const providerRef =
      readString(input.body, 'payment_id', 'paymentId', 'providerRef') ??
      readString(
        input.query as unknown as Record<string, unknown>,
        'payment_id',
        'paymentId',
      );

    if (!providerRef) {
      throw new RpcException({
        code: 'WEBHOOK_PAYLOAD_INVALID',
        message: 'Flouci webhook requires payment_id',
        status: 400,
      });
    }

    const verified = await this.verifyPayment(providerRef);
    const statusRaw = (verified.status ?? '').toUpperCase();

    if (statusRaw === 'SUCCESS' || statusRaw === 'PREAUTH_SUCCESS') {
      return {
        providerRef,
        status: 'captured',
        paymentIdHint: verified.developer_tracking_id ?? undefined,
      };
    }

    if (
      statusRaw === 'FAILURE' ||
      statusRaw === 'EXPIRED' ||
      statusRaw === 'SYSTEM_FAILURE'
    ) {
      return {
        providerRef,
        status: 'failed',
        paymentIdHint: verified.developer_tracking_id ?? undefined,
      };
    }

    return {
      providerRef,
      status: 'pending',
      paymentIdHint: verified.developer_tracking_id ?? undefined,
    };
  }

  private async verifyPayment(
    paymentId: string,
  ): Promise<NonNullable<FlouciVerifyResponse['result']>> {
    const url = `${this.apiBaseUrl}/api/v2/verify_payment/${encodeURIComponent(paymentId)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.publicKey}:${this.privateKey}`,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'network error';
      throw new RpcException({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Flouci verify_payment failed: ${message}`,
        status: 502,
      });
    }

    const payload = (await response.json().catch(() => ({}))) as FlouciVerifyResponse;
    const result = payload.result;

    if (!response.ok || !result?.status) {
      this.logger.warn(
        `[flouci] verify_payment failed status=${response.status} body=${JSON.stringify(payload)}`,
      );
      throw new RpcException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: result?.message ?? 'Flouci payment could not be verified',
        status: 401,
        details: [{ provider: 'flouci', httpStatus: response.status }],
      });
    }

    return result;
  }

  private requireSecrets(): void {
    if (!this.publicKey || !this.privateKey) {
      throw new RpcException({
        code: 'PROVIDER_MISCONFIGURED',
        message:
          'Flouci requires FLOUCI_PUBLIC_KEY and FLOUCI_PRIVATE_KEY in the environment',
        status: 500,
      });
    }
  }
}
