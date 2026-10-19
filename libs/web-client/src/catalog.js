import { api, ApiError, isAbortError } from './api.js';

/**
 * Catalog reads (`GET /v1/catalog/vehicles[/:slug]`). Unlike App 1 there is no
 * bundled seed fallback: demo views show live data or an explicit error state.
 */

/** Same card shape as App 1's `mapVehicleDto`. */
export function mapVehicleDto(dto) {
  return {
    slug: dto.slug,
    name: dto.name,
    cat: dto.category,
    tier: dto.tier,
    price: dto.baseDailyPriceTnd,
    seats: dto.seats,
    bags: dto.bags,
    transmission: dto.transmission,
    image: dto.imageKey,
  };
}

/** Category order used by App 1's fleet filter bar (gateway `VEHICLE_CATEGORIES`). */
export const FLEET_CATEGORIES = Object.freeze(['All', 'Luxury', 'SUV', 'Sedan', 'Van & Group', 'Compact', 'Economy', 'Pick-up']);

/**
 * @param {{ category?: string, page?: number, limit?: number, signal?: AbortSignal }} [options]
 */
export async function fetchVehicles(options = {}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('limit', String(options.limit ?? 100));
  if (options.category && options.category !== 'All') params.set('category', options.category);
  const payload = await api(`/v1/catalog/vehicles?${params}`, { signal: options.signal });
  return {
    vehicles: (payload?.data ?? []).map(mapVehicleDto),
    meta: payload?.meta ?? { page: 1, limit: 100, total: 0 },
  };
}

/**
 * @param {string} slug
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchVehicleBySlug(slug, options = {}) {
  const payload = await api(`/v1/catalog/vehicles/${encodeURIComponent(slug)}`, { signal: options.signal });
  return mapVehicleDto(payload.data);
}

/**
 * Same category first, then the rest of the catalog order.
 * @param {object[]} vehicles
 * @param {{ slug: string, cat?: string }} vehicle
 * @param {number} [count]
 */
export function pickRelated(vehicles, vehicle, count = 3) {
  const others = vehicles.filter((item) => item.slug !== vehicle.slug);
  const sameCategory = others.filter((item) => item.cat === vehicle.cat);
  const rest = others.filter((item) => item.cat !== vehicle.cat);
  return [...sameCategory, ...rest].slice(0, count);
}

/**
 * Vehicle detail plus up to three related models. A 404 from a healthy API
 * means the model is unknown or unpublished.
 * @param {string} slug
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ vehicle: object | null, related: object[], notFound: boolean }>}
 */
export async function loadVehiclePage(slug, options = {}) {
  let vehicle;
  try {
    vehicle = await fetchVehicleBySlug(slug, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { vehicle: null, related: [], notFound: true };
    throw error;
  }
  let related = [];
  try {
    const { vehicles } = await fetchVehicles(options);
    related = pickRelated(vehicles, vehicle);
  } catch (error) {
    if (isAbortError(error, options.signal)) throw error;
  }
  return { vehicle, related, notFound: false };
}

/** @param {unknown} error @param {'en' | 'fr' | 'ar'} lang */
export function catalogErrorMessage(error, lang) {
  const pick = (en, fr, ar) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  if (error instanceof ApiError && (error.status === 0 || error.code === 'API_URL_MISSING')) {
    return pick(
      'The vehicle catalog is not configured for this demo.',
      'Le catalogue des véhicules n’est pas configuré pour cette démo.',
      'كتالوج السيارات غير مهيأ لهذا العرض.',
    );
  }
  return pick(
    'The live vehicle catalog is temporarily unavailable. Please try again in a moment.',
    'Le catalogue des véhicules est temporairement indisponible. Réessayez dans un instant.',
    'كتالوج السيارات المباشر غير متاح مؤقتاً. حاول مرة أخرى بعد قليل.',
  );
}
