import { api, ApiError } from './api.js';
import { FLEET_SEED } from './fleet-seed.js';

/**
 * Playwright SSG sets `window.__VIPCAR_PRERENDER__` in `scripts/prerender.mjs`.
 * Build must not call the gateway (no auth, no catalog availability required).
 * @returns {boolean}
 */
export function isPrerenderBuild() {
  return typeof window !== 'undefined' && window.__VIPCAR_PRERENDER__ === true;
}

/**
 * Map gateway VehicleModelDto → SPA vehicle card shape (keeps SEO slugs).
 * @param {Record<string, unknown>} dto
 */
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

/**
 * @param {{ category?: string, page?: number, limit?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ vehicles: ReturnType<typeof mapVehicleDto>[], meta: { page: number, limit: number, total: number } }>}
 */
export async function fetchVehicles(options = {}) {
  const params = new URLSearchParams();
  params.set('page', String(options.page ?? 1));
  params.set('limit', String(options.limit ?? 100));
  if (options.category && options.category !== 'All') {
    params.set('category', options.category);
  }
  const payload = await api(`/v1/catalog/vehicles?${params}`, {
    signal: options.signal,
  });
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
  const payload = await api(`/v1/catalog/vehicles/${encodeURIComponent(slug)}`, {
    signal: options.signal,
  });
  return mapVehicleDto(payload.data);
}

/**
 * FleetPage loader: live catalog first; bundled seed if API is down.
 * During Playwright prerender: always use bundled seed (no gateway / no auth).
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ vehicles: ReturnType<typeof mapVehicleDto>[], source: 'api' | 'seed' | 'prerender' }>}
 */
export async function loadFleet(options = {}) {
  if (isPrerenderBuild()) {
    return { vehicles: FLEET_SEED, source: 'prerender' };
  }
  try {
    const { vehicles } = await fetchVehicles(options);
    return { vehicles, source: 'api' };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { vehicles: FLEET_SEED, source: 'seed' };
  }
}

/**
 * VehiclePage loader: GET by slug; seed fallback when catalog unreachable.
 * True 404 from a healthy API → notFound (no seed fill-in for unpublished models).
 * During Playwright prerender: seed only (SSG must not depend on API auth or uptime).
 * @param {string} slug
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function loadVehiclePage(slug, options = {}) {
  if (isPrerenderBuild()) {
    const vehicle = FLEET_SEED.find((v) => v.slug === slug) ?? null;
    if (!vehicle) {
      return { vehicle: null, related: [], source: 'prerender', notFound: true };
    }
    return {
      vehicle,
      related: FLEET_SEED.filter((v) => v.slug !== slug).slice(0, 3),
      source: 'prerender',
      notFound: false,
    };
  }
  try {
    const vehicle = await fetchVehicleBySlug(slug, options);
    let related = [];
    try {
      const { vehicles } = await fetchVehicles(options);
      related = vehicles.filter((v) => v.slug !== slug).slice(0, 3);
    } catch (listError) {
      if (isAbortError(listError)) throw listError;
      related = FLEET_SEED.filter((v) => v.slug !== slug).slice(0, 3);
    }
    return { vehicle, related, source: 'api', notFound: false };
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof ApiError && error.status === 404) {
      return { vehicle: null, related: [], source: 'api', notFound: true };
    }
    const vehicle = FLEET_SEED.find((v) => v.slug === slug) ?? null;
    if (!vehicle) {
      return { vehicle: null, related: [], source: 'seed', notFound: true };
    }
    return {
      vehicle,
      related: FLEET_SEED.filter((v) => v.slug !== slug).slice(0, 3),
      source: 'seed',
      notFound: false,
    };
  }
}

/**
 * Soft notice when showing bundled seed (not a hard error UI).
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function fleetOfflineMessage(lang) {
  if (lang === 'ar') {
    return 'الكتالوج المباشر غير متاح مؤقتاً. نعرض الأسطول المحفوظ؛ الأسعار إرشادية حتى التأكيد.';
  }
  return lang === 'en'
    ? 'Live catalog is temporarily unavailable. Showing cached fleet; prices remain indicative until confirmed.'
    : 'Le catalogue en direct est temporairement indisponible. Affichage de la flotte en cache ; tarifs indicatifs jusqu’à confirmation.';
}

function isAbortError(error) {
  return (
    (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError')
  );
}
