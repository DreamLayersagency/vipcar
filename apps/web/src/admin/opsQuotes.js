import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   service: 'rental' | 'transfer' | 'chauffeur',
 *   status: 'received' | 'quoted' | 'expired' | 'converted' | 'cancelled',
 *   vehicleModelId: string | null,
 *   pickupLocationId: string | null,
 *   pickupLabel: string | null,
 *   dropoffLocationId: string | null,
 *   dropoffLabel: string | null,
 *   startAt: string,
 *   endAt: string | null,
 *   passengers: number | null,
 *   duration: string | null,
 *   flightNumber: string | null,
 *   notes: string | null,
 *   customerName: string,
 *   customerPhone: string,
 *   customerEmail: string | null,
 *   customerId: string | null,
 *   language: string,
 *   channel: string,
 *   indicativePriceTnd: number | null,
 *   confirmedPriceTnd: number | null,
 *   createdAt: string,
 * }} Quote
 */

/**
 * @typedef {{ page: number, limit: number, total: number }} PaginationMeta
 */

/**
 * @param {{
 *   status?: string,
 *   page?: number,
 *   limit?: number,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} [opts]
 * @returns {Promise<{ data: Quote[], meta: PaginationMeta }>}
 */
export async function listOpsQuotes(opts = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const payload = await apiWithAuth(`/v1/ops/quotes${q ? `?${q}` : ''}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: {
      page: payload?.meta?.page ?? opts.page ?? 1,
      limit: payload?.meta?.limit ?? opts.limit ?? 20,
      total: payload?.meta?.total ?? 0,
    },
  };
}

/**
 * Resolve a quote by id via the paginated inbox (no GET-by-id on the gateway yet).
 * @param {string} quoteId
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<Quote | null>}
 */
export async function findOpsQuote(quoteId, opts = {}) {
  const limit = 100;
  let page = 1;
  let total = Infinity;
  while ((page - 1) * limit < total) {
    const { data, meta } = await listOpsQuotes({
      page,
      limit,
      locale: opts.locale,
      signal: opts.signal,
    });
    total = meta.total;
    const hit = data.find((q) => q.id === quoteId);
    if (hit) return hit;
    if (!data.length) break;
    page += 1;
    if (page > 50) break;
  }
  return null;
}

/**
 * @param {string} quoteId
 * @param {number} confirmedPriceTnd
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<Quote>}
 */
export async function patchOpsQuotePrice(quoteId, confirmedPriceTnd, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/quotes/${quoteId}`, {
    method: 'PATCH',
    body: { confirmedPriceTnd },
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
}

/**
 * @param {string} quoteId
 * @param {{
 *   unitId?: string,
 *   customerId?: string,
 *   priceTnd?: number,
 *   depositTnd?: number,
 * }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 */
export async function confirmOpsQuote(quoteId, body, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/quotes/${quoteId}/confirm`, {
    method: 'POST',
    body,
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
}

/**
 * @param {number | null | undefined} value
 * @param {'en' | 'fr'} locale
 */
export function formatTnd(value, locale) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  try {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-TN' : 'en-TN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(n);
  } catch {
    return String(n);
  }
}

/**
 * @param {string | null | undefined} iso
 * @param {'en' | 'fr'} locale
 */
export function formatDateTime(iso, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * @param {string | null | undefined} startAt
 * @param {string | null | undefined} endAt
 * @param {'en' | 'fr'} locale
 */
export function formatDateRange(startAt, endAt, locale) {
  const start = formatDateTime(startAt, locale);
  if (!endAt) return start;
  return `${start} → ${formatDateTime(endAt, locale)}`;
}

export function shortId(id) {
  if (!id || id.length < 10) return id || '—';
  return `${id.slice(0, 8)}…`;
}
