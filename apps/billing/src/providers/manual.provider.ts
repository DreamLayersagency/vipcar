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
 * Staff-operated provider: no PSP. Checkout returns instructions;
 * ops marks the payment paid via {@link markPaid}.
 * Webhooks are optional (dev/ops) and require BILLING_WEBHOOK_SECRET when set.
 */
@Injectable()
export class ManualProvider implements PaymentProvider {
  readonly name = 'manual' as const;
  private readonly logger = new Logger(ManualProvider.name);
  private readonly webhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    const secret = (this.config.get<string>('BILLING_WEBHOOK_SECRET') ?? '').trim();
    this.webhookSecret = secret || undefined;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerRef = `manual-${input.paymentId}`;
    const amount = input.amountTnd.toFixed(3);
    const instructions =
      `Manual payment for booking ${input.bookingId}: ` +
      `collect ${amount} TND (${input.kind}), then mark payment ${input.paymentId} as paid.`;

    this.logger.log(
      `[manual] checkout paymentId=${input.paymentId} bookingId=${input.bookingId} amount=${amount}`,
    );

    return { providerRef, instructions };
  }

  async markPaid(input: MarkPaidInput): Promise<MarkPaidResult> {
    const providerRef = input.providerRef ?? `manual-${input.paymentId}`;
    this.logger.log(
      `[manual] markPaid paymentId=${input.paymentId} by=${input.markedByUserId ?? 'staff'}`,
    );
    return { providerRef, status: 'captured' };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    assertWebhookSecret(this.webhookSecret, input.headers, input.query);

    const providerRef =
      readString(input.body, 'providerRef', 'provider_ref') ??
      readString(input.query as unknown as Record<string, unknown>, 'providerRef', 'provider_ref');
    if (!providerRef) {
      throw new RpcException({
        code: 'WEBHOOK_PAYLOAD_INVALID',
        message: 'Manual webhook requires providerRef',
        status: 400,
      });
    }

    const statusRaw = (
      readString(input.body, 'status') ??
      readString(input.query as unknown as Record<string, unknown>, 'status') ??
      'captured'
    ).toLowerCase();

    if (statusRaw === 'failed' || statusRaw === 'failure') {
      return { providerRef, status: 'failed' };
    }

    return {
      providerRef,
      status: 'captured',
      paymentIdHint: readString(input.body, 'paymentId', 'payment_id'),
    };
  }
}
