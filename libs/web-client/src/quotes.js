import { ApiError } from './api.js';
import { apiWithAuth } from './auth.js';

/**
 * Persist a public quote request (`POST /v1/quotes`). Signed-in customers are
 * linked server-side through the optional Bearer token, exactly as in App 1.
 * @param {Record<string, unknown>} body CreateQuoteHttpDto fields
 * @param {{ locale?: string, signal?: AbortSignal }} [options]
 */
export async function createQuote(body, options = {}) {
  return apiWithAuth('/v1/quotes', { method: 'POST', body, locale: options.locale, signal: options.signal });
}

/** Short customer-facing reference; the full UUID stays the key in the back office. */
export function formatQuoteReference(id) {
  if (typeof id !== 'string' || !id.trim()) return '—';
  return `VC-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** @param {unknown} error @param {'en' | 'fr' | 'ar'} lang */
export function quoteErrorMessage(error, lang) {
  const pick = (en, fr, ar) => (lang === 'ar' ? ar : lang === 'fr' ? fr : en);
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return pick(
        'Quote service is not configured. Please try WhatsApp or call us.',
        'Le service de devis n’est pas configuré. Écrivez-nous sur WhatsApp ou appelez-nous.',
        'خدمة عروض الأسعار غير مهيأة. جرّب واتساب أو اتصل بنا.',
      );
    }
    if (error.code === 'SERVICE_UNAVAILABLE' || error.status >= 500) {
      return pick(
        'The quote service is temporarily unavailable. Please retry in a moment or contact us on WhatsApp.',
        'Le service de devis est temporairement indisponible. Réessayez dans un instant ou contactez-nous sur WhatsApp.',
        'خدمة عروض الأسعار غير متاحة مؤقتاً. أعد المحاولة بعد قليل أو تواصل معنا عبر واتساب.',
      );
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message || pick('Please check your details and try again.', 'Vérifiez vos informations et réessayez.', 'تحقق من معلوماتك ثم أعد المحاولة.');
    }
  }
  return pick(
    'We could not save your quote. Please try again in a moment.',
    'Impossible d’enregistrer votre devis. Réessayez dans un instant.',
    'تعذر حفظ عرض السعر. أعد المحاولة بعد قليل.',
  );
}

/** WhatsApp follow-up text after a successful save (same wording as App 1). */
export function buildWhatsAppQuoteMessage(fields) {
  const lines = [
    'Hello VIPCAR, quote request.',
    `Service: ${fields.service}.`,
    fields.vehicleName ? `Vehicle: ${fields.vehicleName}.` : null,
    `Pick-up: ${fields.pickup}.`,
    fields.dropoff ? `Return / drop-off: ${fields.dropoff}.` : null,
    fields.endDate ? `Dates: ${fields.startDate} to ${fields.endDate}.` : `Date: ${fields.startDate}.`,
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
export function whatsAppUrl(text, waBase) {
  return `${waBase}?text=${encodeURIComponent(text)}`;
}
