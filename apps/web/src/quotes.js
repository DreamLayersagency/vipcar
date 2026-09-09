import { ApiError } from './api.js';
import { apiWithAuth } from './auth.js';

/**
 * Persist a public quote via the gateway.
 * @param {Record<string, unknown>} body CreateQuoteHttpDto fields
 * @param {{ locale?: 'en' | 'fr' | 'ar', signal?: AbortSignal, token?: string | null }} [options]
 * @returns {Promise<{ data: unknown }>}
 */
export async function createQuote(body, options = {}) {
  return apiWithAuth('/v1/quotes', {
    method: 'POST',
    body,
    token: options.token,
    locale: options.locale,
    signal: options.signal,
  });
}

/**
 * Short, safe reference shown to customers after a request is saved.
 * The full quote UUID remains the correlation key in the API and backoffice.
 * @param {unknown} id
 */
export function formatQuoteReference(id) {
  if (typeof id !== 'string' || !id.trim()) return '—';
  const compactId = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `VC-${compactId}`;
}

/**
 * User-facing message from an API / network failure (form stays filled).
 * @param {unknown} error
 * @param {'en' | 'fr' | 'ar'} lang
 */
export function quoteErrorMessage(error, lang) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return lang === 'en'
        ? 'Quote service is not configured. Please try WhatsApp or call us.'
        : lang === 'ar'
          ? 'خدمة عروض الأسعار غير مهيأة. جرّب واتساب أو اتصل بنا.'
          : 'Le service de devis n’est pas configuré. Écrivez-nous sur WhatsApp ou appelez-nous.';
    }
    if (error.code === 'SERVICE_UNAVAILABLE' || error.status >= 500) {
      return lang === 'en'
        ? 'The quote service is temporarily unavailable. Please retry in a moment or contact us on WhatsApp.'
        : lang === 'ar'
          ? 'خدمة عروض الأسعار غير متاحة مؤقتاً. أعد المحاولة بعد قليل أو تواصل معنا عبر واتساب.'
          : 'Le service de devis est temporairement indisponible. Réessayez dans un instant ou contactez-nous sur WhatsApp.';
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message
        || (lang === 'en'
          ? 'Please check your details and try again.'
          : lang === 'ar'
            ? 'تحقق من معلوماتك ثم أعد المحاولة.'
            : 'Vérifiez vos informations et réessayez.');
    }
  }
  return lang === 'en'
    ? 'We could not save your quote. Please try again in a moment.'
    : lang === 'ar'
      ? 'تعذر حفظ عرض السعر. أعد المحاولة بعد قليل.'
      : 'Impossible d’enregistrer votre devis. Réessayez dans un instant.';
}

/**
 * WhatsApp follow-up text after a successful persist (channel, not storage).
 * @param {{
 *   service: string,
 *   pickup: string,
 *   startDate: string,
 *   endDate?: string,
 *   name: string,
 *   phone: string,
 *   email?: string,
 *   notes?: string,
 *   duration?: string,
 *   passengers?: number | string,
 *   flightNumber?: string,
 *   vehicleName?: string,
 *   dropoff?: string,
 * }} fields
 */
export function buildWhatsAppQuoteMessage(fields) {
  const lines = [
    'Hello VIPCAR, quote request.',
    `Service: ${fields.service}.`,
    fields.vehicleName ? `Vehicle: ${fields.vehicleName}.` : null,
    `Pick-up: ${fields.pickup}.`,
    fields.dropoff ? `Return / drop-off: ${fields.dropoff}.` : null,
    fields.endDate
      ? `Dates: ${fields.startDate} to ${fields.endDate}.`
      : `Date: ${fields.startDate}.`,
    fields.duration ? `Duration: ${fields.duration}.` : null,
    fields.passengers ? `Passengers: ${fields.passengers}.` : null,
    fields.flightNumber ? `Flight number: ${fields.flightNumber}.` : null,
    `Name: ${fields.name}.`,
    `Phone: ${fields.phone}.`,
    fields.email ? `Email: ${fields.email}.` : null,
    fields.notes ? `Notes: ${fields.notes}.` : null,
  ];
  return lines.filter(Boolean).join(' ');
}

/**
 * @param {string} text
 * @param {string} waBase e.g. https://wa.me/21655771077
 */
export function openWhatsAppQuote(text, waBase) {
  location.href = `${waBase}?text=${encodeURIComponent(text)}`;
}
