import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   status: string,
 *   quote: object,
 *   customer: { id: string | null, name: string, phone: string, email: string | null, language: string },
 *   trip: { service: string, vehicleModelId: string | null, pickupLocationId: string | null, pickupLabel: string | null, dropoffLocationId: string | null, dropoffLabel: string | null, startAt: string, endAt: string | null, passengers: number | null, duration: string | null, flightNumber: string | null, notes: string | null },
 *   vehicleModel: { id: string | null },
 *   fleetUnit: { id: string | null },
 *   driver: { id: string | null },
 *   booking: object | null,
 *   createdAt: string,
 *   updatedAt: string,
 * }} Reservation
 */

/**
 * @typedef {{ page: number, limit: number, total: number }} PaginationMeta
 */

/**
 * @param {{
 *   status?: string,
 *   service?: string,
 *   channel?: string,
 *   from?: string,
 *   to?: string,
 *   search?: string,
 *   page?: number,
 *   limit?: number,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} [opts]
 * @returns {Promise<{ data: Reservation[], meta: PaginationMeta }>}
 */
export async function listOpsReservations(opts = {}) {
  const params = new URLSearchParams();
  for (const key of ['status', 'service', 'channel', 'from', 'to', 'search']) {
    if (opts[key]) params.set(key, String(opts[key]));
  }
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const query = params.toString();
  const payload = await apiWithAuth(`/v1/ops/reservations${query ? `?${query}` : ''}`, {
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

/** @param {string} reservationId @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts] */
export async function getOpsReservation(reservationId, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/reservations/${reservationId}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || null;
}

/** @param {string} reservationId @param {number} confirmedPriceTnd @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts] */
export async function patchOpsReservationPrice(reservationId, confirmedPriceTnd, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/reservations/${reservationId}/price`, {
    method: 'PATCH',
    body: { confirmedPriceTnd },
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || null;
}

/** @param {string} reservationId @param {object} body @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts] */
export async function confirmOpsReservation(reservationId, body, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/reservations/${reservationId}/confirm`, {
    method: 'POST',
    body,
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || null;
}

/** @param {string} reservationId @param {object} body @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts] */
export async function updateOpsReservationStatus(reservationId, body, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/reservations/${reservationId}/status`, {
    method: 'PATCH',
    body,
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || null;
}

/** @param {string} reservationId @param {string} unitId @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts] */
export async function assignOpsReservationUnit(reservationId, unitId, opts = {}) {
  const payload = await apiWithAuth(`/v1/ops/reservations/${reservationId}/assign`, {
    method: 'POST',
    body: { unitId },
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload?.data || null;
}

export { formatDateRange, formatDateTime, formatTnd, shortId } from './opsQuotes.js';

export function isApiError(error) {
  return error instanceof Error && error.name === 'ApiError';
}
