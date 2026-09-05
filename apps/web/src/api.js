/**
 * Browser client for the VIPCAR gateway only (`VITE_API_URL`).
 * Never call catalog/booking/identity/etc. HTTP ports from the SPA.
 */

const rawBase = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

export const apiBaseUrl = rawBase;

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

/**
 * @param {string} path Absolute gateway path, e.g. `/v1/quotes`
 * @param {{
 *   method?: string,
 *   body?: unknown,
 *   token?: string | null,
 *   locale?: 'en' | 'fr',
 *   idempotencyKey?: string,
 *   headers?: Record<string, string>,
 *   signal?: AbortSignal,
 * }} [options]
 * @returns {Promise<any>} Parsed JSON body (typically `{ data }` or `{ data, meta }`)
 */
export async function api(path, options = {}) {
  if (!apiBaseUrl) {
    throw new ApiError({
      status: 0,
      code: 'API_URL_MISSING',
      message: 'VITE_API_URL is not configured',
    });
  }

  const {
    method = 'GET',
    body,
    token,
    locale,
    idempotencyKey,
    headers: extraHeaders,
    signal,
  } = options;

  const headers = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(locale ? { 'Accept-Language': locale } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...extraHeaders,
  };

  const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
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
      throw new ApiError({
        status: response.status,
        code: 'INVALID_JSON',
        message: 'Gateway returned a non-JSON response',
      });
    }
  }

  if (!response.ok) {
    const err = payload?.error;
    throw new ApiError({
      status: response.status,
      code: err?.code ?? 'HTTP_ERROR',
      message: err?.message ?? `Request failed (${response.status})`,
      details: err?.details ?? [],
    });
  }

  return payload;
}
