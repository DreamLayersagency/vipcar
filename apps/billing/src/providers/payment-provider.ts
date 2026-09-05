import type {
  PaymentKindLabel,
  PaymentProviderLabel,
  PaymentStatusLabel,
} from '@vipcar/contracts';

export type CreateCheckoutInput = {
  paymentId: string;
  bookingId: string;
  kind: PaymentKindLabel;
  amountTnd: number;
  returnUrl?: string;
};

export type CreateCheckoutResult = {
  providerRef?: string;
  checkoutUrl?: string;
  instructions?: string;
};

export type MarkPaidInput = {
  paymentId: string;
  providerRef?: string | null;
  markedByUserId?: string;
};

export type MarkPaidResult = {
  providerRef: string;
  status: 'captured';
};

export type VerifyWebhookInput = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
  query: Record<string, string>;
};

/**
 * Outcome after authenticating a webhook and reading provider status.
 * `pending` means authenticated but not yet terminal — no Payment update.
 */
export type VerifyWebhookResult = {
  providerRef: string;
  status: Extract<PaymentStatusLabel, 'captured' | 'failed' | 'pending' | 'authorized'>;
  /** Our Payment.id when the PSP echoes orderId / tracking id. */
  paymentIdHint?: string;
};

/**
 * Port for payment adapters (manual, Konnect, Flouci, Stripe).
 * Secrets belong in env only — never in git or this interface.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderLabel;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /**
   * Staff capture path. ManualProvider implements this; PSP adapters reject
   * and expect webhooks instead (F4).
   */
  markPaid(input: MarkPaidInput): Promise<MarkPaidResult>;
  /**
   * Authenticate webhook (signature and/or provider API) and return status.
   * Throws RpcException with 401/400 on invalid signature or payload.
   */
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
