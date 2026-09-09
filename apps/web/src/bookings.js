import { api, ApiError } from './api.js';
import { getAccessToken } from './auth.js';

/**
 * Customer portal: `GET /v1/me/bookings` with Bearer token.
 * @param {{ page?: number, limit?: number, locale?: 'en' | 'fr', signal?: AbortSignal, token?: string | null }} [options]
 * @returns {Promise<{ data: object[], meta?: object }>}
 */
export async function listMyBookings(options = {}) {
  const token = options.token ?? getAccessToken();
  if (!token) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return api(`/v1/me/bookings?${qs}`, {
    method: 'GET',
    token,
    locale: options.locale,
    signal: options.signal,
  });
}

/**
 * @param {unknown} error
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function bookingsErrorMessage(error, lang) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return lang === 'en'
        ? 'Please sign in to view your bookings.'
        : lang === 'ar'
          ? 'سجّل الدخول لعرض حجوزاتك.'
          : 'Connectez-vous pour voir vos réservations.';
    }
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return lang === 'en'
        ? 'Bookings are not available right now. Please try again later.'
        : lang === 'ar'
          ? 'الحجوزات غير متاحة حالياً. حاول مرة أخرى لاحقاً.'
          : 'Les réservations ne sont pas disponibles pour le moment. Réessayez plus tard.';
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message
        || (lang === 'en'
          ? 'Could not load your bookings.'
          : lang === 'ar'
            ? 'تعذر تحميل حجوزاتك.'
            : 'Impossible de charger vos réservations.');
    }
  }
  return lang === 'en'
    ? 'Could not load your bookings. Please try again in a moment.'
    : lang === 'ar'
      ? 'تعذر تحميل حجوزاتك. حاول مرة أخرى بعد قليل.'
      : 'Impossible de charger vos réservations. Réessayez dans un instant.';
}

const SERVICE_LABELS = {
  en: { rental: 'Car rental', transfer: 'Airport transfer', chauffeur: 'Private chauffeur' },
  fr: { rental: 'Location', transfer: 'Transfert aéroport', chauffeur: 'Chauffeur privé' },
  ar: { rental: 'تأجير السيارات', transfer: 'النقل من المطار', chauffeur: 'سائق خاص' },
};

const STATUS_LABELS = {
  en: {
    awaiting_payment: 'Awaiting payment',
    confirmed: 'Confirmed',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  },
  fr: {
    awaiting_payment: 'En attente de paiement',
    confirmed: 'Confirmée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée',
    no_show: 'Absence',
  },
  ar: {
    awaiting_payment: 'في انتظار الدفع',
    confirmed: 'مؤكدة',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    no_show: 'لم يحضر العميل',
  },
};

/**
 * @param {string} type
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function bookingServiceLabel(type, lang) {
  return SERVICE_LABELS[lang]?.[type] ?? type;
}

/**
 * @param {string} status
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function bookingStatusLabel(status, lang) {
  return STATUS_LABELS[lang]?.[status] ?? status;
}

/**
 * @param {string} iso
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function formatBookingDate(iso, lang) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-TN' : lang === 'ar' ? 'ar-TN' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
