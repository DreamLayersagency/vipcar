import { timingSafeEqual } from 'crypto';
import { RpcException } from '@nestjs/microservices';

/**
 * Optional shared webhook gate: when `BILLING_WEBHOOK_SECRET` is set, require
 * matching `token` query or `x-vipcar-webhook-secret` / `x-webhook-secret` header.
 * Put the token in PSP webhook URLs (Konnect/Flouci support custom query strings).
 */
export function assertWebhookSecret(
  secret: string | undefined,
  headers: Record<string, string>,
  query: Record<string, string>,
): void {
  const expected = (secret ?? '').trim();
  if (!expected) return;

  const provided =
    (query.token ?? '').trim() ||
    (headers['x-vipcar-webhook-secret'] ?? '').trim() ||
    (headers['x-webhook-secret'] ?? '').trim();

  if (!provided || !safeEqual(expected, provided)) {
    throw new RpcException({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      message: 'Invalid or missing webhook signature',
      status: 401,
    });
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function readString(
  source: Record<string, unknown> | undefined,
  ...keys: string[]
): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}
