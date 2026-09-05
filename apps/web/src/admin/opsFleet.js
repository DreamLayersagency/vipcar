import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   modelId: string,
 *   plate: string,
 *   hubId: string,
 *   status: 'available' | 'reserved' | 'rented' | 'maintenance' | 'inactive',
 *   depositAmountTnd: number,
 * }} VehicleUnit
 */

export const UNIT_STATUSES = Object.freeze([
  'available',
  'reserved',
  'rented',
  'maintenance',
  'inactive',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} value
 */
export function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

/**
 * Local datetime-local value → ISO string (UTC).
 * @param {string} localValue
 * @returns {string | null}
 */
export function localInputToIso(localValue) {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * ISO → value for datetime-local input (local timezone).
 * @param {string | null | undefined} iso
 */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Default search window: now → +24h (half-open end exclusive).
 */
export function defaultAvailabilityWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: isoToLocalInput(start.toISOString()),
    end: isoToLocalInput(end.toISOString()),
  };
}

/**
 * @param {{
 *   modelId: string,
 *   hubId: string,
 *   start: string,
 *   end: string,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} opts
 * @returns {Promise<{ data: VehicleUnit[] }>}
 */
export async function searchFleetAvailability(opts) {
  const params = new URLSearchParams({
    modelId: opts.modelId,
    hubId: opts.hubId,
    start: opts.start,
    end: opts.end,
  });
  const payload = await apiWithAuth(`/v1/ops/fleet/availability?${params}`, {
    locale: opts.locale,
    signal: opts.signal,
  });
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
  };
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

export function shortId(id) {
  if (!id || id.length < 10) return id || '—';
  return `${id.slice(0, 8)}…`;
}
