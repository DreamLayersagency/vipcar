import type { LocaleLabel, QuoteDto } from '@vipcar/contracts';

export type RenderedMessage = {
  subject: string;
  body: string;
};

export function renderQuoteCreated(
  quote: QuoteDto,
  locale: LocaleLabel = quote.language,
): RenderedMessage {
  const isContact = quote.channel === 'contact';
  const pickup = quote.pickupLabel ?? quote.pickupLocationId ?? '—';
  const dropoff = quote.dropoffLabel ?? quote.dropoffLocationId ?? null;
  const start = quote.startAt;
  const end = quote.endAt;

  if (locale === 'fr') {
    if (isContact) {
      return {
        subject: `[VIPCAR] Message contact — ${quote.customerName}`,
        body: [
          `Nouveau message contact VIPCAR (#${quote.id.slice(0, 8)})`,
          `Client: ${quote.customerName} · ${quote.customerPhone}`,
          quote.customerEmail ? `Email: ${quote.customerEmail}` : null,
          `Canal: contact · Langue: ${quote.language}`,
          quote.notes ? `Message: ${quote.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }

    const lines = [
      `Nouvelle demande VIPCAR (#${quote.id.slice(0, 8)})`,
      `Service: ${quote.service}`,
      `Client: ${quote.customerName} · ${quote.customerPhone}`,
      quote.customerEmail ? `Email: ${quote.customerEmail}` : null,
      `Prise en charge: ${pickup}`,
      dropoff ? `Destination: ${dropoff}` : null,
      `Début: ${start}`,
      end ? `Fin: ${end}` : null,
      quote.duration ? `Durée: ${quote.duration}` : null,
      quote.flightNumber ? `Vol: ${quote.flightNumber}` : null,
      quote.passengers != null ? `Passagers: ${quote.passengers}` : null,
      `Canal: ${quote.channel} · Langue: ${quote.language}`,
      quote.notes ? `Notes: ${quote.notes}` : null,
    ].filter(Boolean);

    return {
      subject: `[VIPCAR] Nouvelle demande ${quote.service} — ${quote.customerName}`,
      body: lines.join('\n'),
    };
  }

  if (isContact) {
    return {
      subject: `[VIPCAR] Contact message — ${quote.customerName}`,
      body: [
        `New VIPCAR contact message (#${quote.id.slice(0, 8)})`,
        `Customer: ${quote.customerName} · ${quote.customerPhone}`,
        quote.customerEmail ? `Email: ${quote.customerEmail}` : null,
        `Channel: contact · Locale: ${quote.language}`,
        quote.notes ? `Message: ${quote.notes}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  const lines = [
    `New VIPCAR quote (#${quote.id.slice(0, 8)})`,
    `Service: ${quote.service}`,
    `Customer: ${quote.customerName} · ${quote.customerPhone}`,
    quote.customerEmail ? `Email: ${quote.customerEmail}` : null,
    `Pickup: ${pickup}`,
    dropoff ? `Dropoff: ${dropoff}` : null,
    `Start: ${start}`,
    end ? `End: ${end}` : null,
    quote.duration ? `Duration: ${quote.duration}` : null,
    quote.flightNumber ? `Flight: ${quote.flightNumber}` : null,
    quote.passengers != null ? `Passengers: ${quote.passengers}` : null,
    `Channel: ${quote.channel} · Locale: ${quote.language}`,
    quote.notes ? `Notes: ${quote.notes}` : null,
  ].filter(Boolean);

  return {
    subject: `[VIPCAR] New ${quote.service} quote — ${quote.customerName}`,
    body: lines.join('\n'),
  };
}
