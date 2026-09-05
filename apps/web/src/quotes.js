import { api, ApiError } from './api.js';

/**
 * Persist a public quote via the gateway.
 * @param {Record<string, unknown>} body CreateQuoteHttpDto fields
 * @param {{ locale?: 'en' | 'fr', signal?: AbortSignal }} [options]
 * @returns {Promise<{ data: unknown }>}
 */
export async function createQuote(body, options = {}) {
  return api('/v1/quotes', {
    method: 'POST',
    body,
    locale: options.locale,
    signal: options.signal,
  });
}

/**
 * User-facing message from an API / network failure (form stays filled).
 * @param {unknown} error
 * @param {'en' | 'fr'} lang
 */
export function quoteErrorMessage(error, lang) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'API_URL_MISSING') {
      return lang === 'en'
        ? 'Quote service is not configured. Please try WhatsApp or call us.'
        : 'Le service de devis n’est pas configuré. Écrivez-nous sur WhatsApp ou appelez-nous.';
    }
    if (error.status >= 400 && error.status < 500) {
      return error.message
        || (lang === 'en'
          ? 'Please check your details and try again.'
          : 'Vérifiez vos informations et réessayez.');
    }
  }
  return lang === 'en'
    ? 'We could not save your quote. Please try again in a moment.'
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
