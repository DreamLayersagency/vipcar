import { api, ApiError } from './api.js';
import { getAccessToken } from './auth.js';

/**
 * Customer portal: `GET /v1/me/bookings` (role `customer`), same call as App 1.
 * @param {{ page?: number, limit?: number, locale?: string, signal?: AbortSignal, token?: string | null }} [options]
 */
export async function listMyBookings(options = {}) {
  const token = options.token ?? getAccessToken();
  if (!token) throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' });
  const qs = new URLSearchParams({ page: String(options.page ?? 1), limit: String(options.limit ?? 20) });
  return api(`/v1/me/bookings?${qs}`, { method: 'GET', token, locale: options.locale, signal: options.signal });
}

/** @param {unknown} error @param {'en' | 'fr' | 'ar'} lang */
export function bookingsErrorMessage(error, lang) {
  const pick = (en, fr, ar) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return pick('Please sign in to view your bookings.', 'Connectez-vous pour voir vos réservations.', 'سجّل الدخول لعرض حجوزاتك.');
    }
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return pick(
        'Bookings are not available right now. Please try again later.',
        'Les réservations ne sont pas disponibles pour le moment. Réessayez plus tard.',
        'الحجوزات غير متاحة حالياً. حاول مرة أخرى لاحقاً.',
      );
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message || pick('Could not load your bookings.', 'Impossible de charger vos réservations.', 'تعذر تحميل حجوزاتك.');
    }
  }
  return pick(
    'Could not load your bookings. Please try again in a moment.',
    'Impossible de charger vos réservations. Réessayez dans un instant.',
    'تعذر تحميل حجوزاتك. حاول مرة أخرى بعد قليل.',
  );
}

const SERVICE_LABELS = {
  en: { rental: 'Car rental', transfer: 'Airport transfer', chauffeur: 'Private chauffeur' },
  fr: { rental: 'Location', transfer: 'Transfert aéroport', chauffeur: 'Chauffeur privé' },
  ar: { rental: 'تأجير السيارات', transfer: 'النقل من المطار', chauffeur: 'سائق خاص' },
};

const STATUS_LABELS = {
  en: { awaiting_payment: 'Awaiting payment', confirmed: 'Confirmed', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' },
  fr: { awaiting_payment: 'En attente de paiement', confirmed: 'Confirmée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée', no_show: 'Absence' },
  ar: { awaiting_payment: 'في انتظار الدفع', confirmed: 'مؤكدة', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'لم يحضر العميل' },
};

export function bookingServiceLabel(type, lang) {
  return SERVICE_LABELS[lang]?.[type] ?? type;
}

export function bookingStatusLabel(status, lang) {
  return STATUS_LABELS[lang]?.[status] ?? status;
}

export function formatBookingDate(iso, lang) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-TN' : lang === 'ar' ? 'ar-TN' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
