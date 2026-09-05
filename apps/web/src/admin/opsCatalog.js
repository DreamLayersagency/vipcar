import { apiWithAuth } from '../auth.js';

/**
 * @typedef {{
 *   id: string,
 *   slug: string,
 *   name: string,
 *   category: string,
 *   tier: string,
 *   seats: number,
 *   bags: number,
 *   transmission: string,
 *   imageKey: string,
 *   baseDailyPriceTnd: number,
 *   defaultHubId: string | null,
 *   isPublished: boolean,
 * }} VehicleModel
 */

/**
 * @typedef {{ page: number, limit: number, total: number }} PaginationMeta
 */

export const VEHICLE_CATEGORIES = Object.freeze([
  'Luxury',
  'SUV',
  'Sedan',
  'Van & Group',
  'Compact',
  'Economy',
  'Pick-up',
]);

export const VEHICLE_TIERS = Object.freeze(['Luxury', 'Premium', 'Standard', 'Economy']);

export const TRANSMISSIONS = Object.freeze(['Automatic', 'Manual']);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {{
 *   category?: string,
 *   isPublished?: boolean,
 *   page?: number,
 *   limit?: number,
 *   locale?: 'en' | 'fr',
 *   signal?: AbortSignal,
 * }} [opts]
 * @returns {Promise<{ data: VehicleModel[], meta: PaginationMeta }>}
 */
export async function listOpsVehicles(opts = {}) {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  if (typeof opts.isPublished === 'boolean') {
    params.set('isPublished', opts.isPublished ? 'true' : 'false');
  }
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const q = params.toString();
  const payload = await apiWithAuth(`/v1/ops/catalog/vehicles${q ? `?${q}` : ''}`, {
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
 * @param {string} slug
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<VehicleModel>}
 */
export async function getOpsVehicle(slug, opts = {}) {
  const payload = await apiWithAuth(
    `/v1/ops/catalog/vehicles/${encodeURIComponent(slug)}`,
    {
      locale: opts.locale,
      signal: opts.signal,
    },
  );
  return payload.data;
}

/**
 * @param {string} slug
 * @param {Omit<VehicleModel, 'id'> & { slug: string }} body
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [opts]
 * @returns {Promise<VehicleModel>}
 */
export async function upsertOpsVehicle(slug, body, opts = {}) {
  const payload = await apiWithAuth(
    `/v1/ops/catalog/vehicles/${encodeURIComponent(slug)}`,
    {
      method: 'PUT',
      body,
      locale: opts.locale,
      signal: opts.signal,
    },
  );
  return payload.data;
}

/**
 * @param {string} name
 */
export function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Client-side validation aligned with UpsertVehicleDto.
 * @param {Record<string, unknown>} form
 * @param {{ editing?: boolean }} [opts]
 * @returns {Record<string, string>}
 */
export function validateVehicleForm(form, opts = {}) {
  /** @type {Record<string, string>} */
  const errors = {};
  const slug = String(form.slug || '').trim();
  const name = String(form.name || '').trim();
  const category = String(form.category || '');
  const tier = String(form.tier || '');
  const transmission = String(form.transmission || '');
  const imageKey = String(form.imageKey || '').trim();
  const seats = Number(form.seats);
  const bags = Number(form.bags);
  const price = Number(form.baseDailyPriceTnd);
  const hub = String(form.defaultHubId || '').trim();

  if (!slug) errors.slug = 'required';
  else if (!SLUG_RE.test(slug)) errors.slug = 'slug';
  else if (!opts.editing && slug === 'new') errors.slug = 'reserved';

  if (!name) errors.name = 'required';

  if (!VEHICLE_CATEGORIES.includes(category)) errors.category = 'enum';
  if (!VEHICLE_TIERS.includes(tier)) errors.tier = 'enum';
  if (!TRANSMISSIONS.includes(transmission)) errors.transmission = 'enum';

  if (!Number.isInteger(seats) || seats < 1) errors.seats = 'seats';
  if (!Number.isInteger(bags) || bags < 0) errors.bags = 'bags';
  if (!imageKey) errors.imageKey = 'required';
  if (!Number.isFinite(price) || price < 0) errors.baseDailyPriceTnd = 'price';

  if (hub && !UUID_RE.test(hub)) errors.defaultHubId = 'uuid';

  return errors;
}

/**
 * @param {Record<string, unknown>} form
 */
export function toUpsertBody(form) {
  const hub = String(form.defaultHubId || '').trim();
  return {
    slug: String(form.slug || '').trim(),
    name: String(form.name || '').trim(),
    category: String(form.category || ''),
    tier: String(form.tier || ''),
    seats: Number(form.seats),
    bags: Number(form.bags),
    transmission: String(form.transmission || ''),
    imageKey: String(form.imageKey || '').trim(),
    baseDailyPriceTnd: Number(form.baseDailyPriceTnd),
    defaultHubId: hub || null,
    isPublished: Boolean(form.isPublished),
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

export function emptyVehicleForm() {
  return {
    slug: '',
    name: '',
    category: 'Sedan',
    tier: 'Standard',
    seats: 4,
    bags: 2,
    transmission: 'Automatic',
    imageKey: '',
    baseDailyPriceTnd: 0,
    defaultHubId: '',
    isPublished: false,
  };
}

/**
 * @param {VehicleModel} vehicle
 */
export function vehicleToForm(vehicle) {
  return {
    slug: vehicle.slug,
    name: vehicle.name,
    category: vehicle.category,
    tier: vehicle.tier,
    seats: vehicle.seats,
    bags: vehicle.bags,
    transmission: vehicle.transmission,
    imageKey: vehicle.imageKey,
    baseDailyPriceTnd: vehicle.baseDailyPriceTnd,
    defaultHubId: vehicle.defaultHubId || '',
    isPublished: Boolean(vehicle.isPublished),
  };
}
