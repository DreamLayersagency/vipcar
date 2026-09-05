import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   bookingId: string,
 *   driverId?: string | null,
 *   type: 'transfer' | 'chauffeur',
 *   flightNumber?: string | null,
 *   duration?: string | null,
 *   status: AssignmentStatus,
 *   scheduledAt: string,
 * }} Assignment
 */

/** @typedef {'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled'} AssignmentStatus */
/** @typedef {'en_route' | 'arrived' | 'completed'} TripProgressStatus */

export const ASSIGNMENT_STATUSES = Object.freeze([
  'pending',
  'assigned',
  'en_route',
  'arrived',
  'completed',
  'cancelled',
]);

export const TRIP_PROGRESS_STATUSES = Object.freeze(['en_route', 'arrived', 'completed']);

/** Allowed trip transitions (mirrors dispatch assignment-status.machine). */
const TRIP_ALLOWED = Object.freeze({
  assigned: ['en_route'],
  en_route: ['arrived', 'completed'],
  arrived: ['completed'],
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} value
 */
export function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

/**
 * Next trip statuses allowed from the current assignment status.
 * @param {string} from
 * @returns {TripProgressStatus[]}
 */
export function nextTripStatuses(from) {
  return /** @type {TripProgressStatus[]} */ (TRIP_ALLOWED[from] || []);
}

/**
 * @param {{ bookingId: string, driverId: string }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<Assignment>}
 */
export async function assignDriver(body, opts = {}) {
  const payload = await apiWithAuth('/v1/ops/dispatch/assign', {
    method: 'POST',
    body: {
      bookingId: body.bookingId.trim(),
      driverId: body.driverId.trim(),
    },
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
}

/**
 * @param {{ assignmentId: string, status: TripProgressStatus }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<Assignment>}
 */
export async function updateTripStatus(body, opts = {}) {
  const payload = await apiWithAuth('/v1/ops/dispatch/trip/status', {
    method: 'POST',
    body: {
      assignmentId: body.assignmentId.trim(),
      status: body.status,
    },
    locale: opts.locale,
    signal: opts.signal,
  });
  return payload.data;
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

export function shortId(id) {
  if (!id || id.length < 10) return id || '—';
  return `${id.slice(0, 8)}…`;
}
