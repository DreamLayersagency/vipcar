import { getClientConfig } from './config.js';

/**
 * Browser client for the VIPCAR gateway only. Same request/response contract
 * as App 1 (`apps/web/src/api.js`): `{ data }` / `{ data, meta }` on success,
 * `{ error: { code, message, details } }` on failure.
 */

export class ApiError extends Error {
  /**
   * @param {{ status: number, code?: string, message: string, details?: unknown[] }} opts
   */
  constructor({ status, code = 'UNKNOWN', message, details = [] }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const UNAVAILABLE = {
  en: 'A required service is temporarily unavailable. Please try again in a moment.',
  fr: 'Un service requis est temporairement indisponible. Réessayez dans un instant.',
  ar: 'إحدى الخدمات المطلوبة غير متاحة مؤقتاً. حاول مرة أخرى بعد قليل.',
};

/**
 * @param {string} path Absolute gateway path, e.g. `/v1/quotes`
 * @param {{
 *   method?: string,
 *   body?: unknown,
 *   token?: string | null,
 *   locale?: 'en' | 'fr' | 'ar',
 *   idempotencyKey?: string,
 *   headers?: Record<string, string>,
 *   signal?: AbortSignal,
 * }} [options]
 */
export async function api(path, options = {}) {
  const { apiBaseUrl } = getClientConfig();
  if (!apiBaseUrl) {
    throw new ApiError({ status: 0, code: 'API_URL_MISSING', message: 'API URL is not configured' });
  }

  const { method = 'GET', body, token, locale, idempotencyKey, headers: extraHeaders, signal } = options;
  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    // The gateway localizes en/fr only; Arabic pages keep App 1's behaviour of sending `ar`.
    ...(locale ? { 'Accept-Language': locale } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...extraHeaders,
  };

  const response = await fetch(`${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers,
    signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError({ status: response.status, code: 'INVALID_JSON', message: 'Gateway returned a non-JSON response' });
    }
  }

  if (!response.ok) {
    const err = payload?.error;
    const rawMessage = err?.message ?? `Request failed (${response.status})`;
    const serviceUnavailable =
      err?.code === 'SERVICE_UNAVAILABLE'
      || (typeof rawMessage === 'string' && /no subscribers listening|empty response/i.test(rawMessage));
    throw new ApiError({
      status: serviceUnavailable ? 503 : response.status,
      code: serviceUnavailable ? 'SERVICE_UNAVAILABLE' : err?.code ?? 'HTTP_ERROR',
      message: serviceUnavailable ? UNAVAILABLE[locale] ?? UNAVAILABLE.en : rawMessage,
      details: err?.details ?? [],
    });
  }

  return payload;
}

/** @param {unknown} error @param {AbortSignal} [signal] */
export function isAbortError(error, signal) {
  return (
    Boolean(signal?.aborted)
    || (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError')
  );
}
