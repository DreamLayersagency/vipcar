import type {
  DispatchAssignedEventDto,
  DispatchTripStatusEventDto,
  LocaleLabel,
} from '@vipcar/contracts';

export type RenderedMessage = {
  subject: string;
  body: string;
};

export function renderDispatchAssigned(
  event: Pick<
    DispatchAssignedEventDto,
    | 'bookingId'
    | 'customerName'
    | 'locale'
    | 'driverName'
    | 'driverPhone'
  >,
  locale: LocaleLabel = event.locale ?? 'en',
): RenderedMessage {
  const bookingRef = event.bookingId.slice(0, 8);
  const name = event.customerName?.trim() || null;
  const driver = event.driverName?.trim() || null;
  const phone = event.driverPhone?.trim() || null;

  if (locale === 'fr') {
    return {
      subject: `[VIPCAR] Chauffeur assigné — réservation #${bookingRef}`,
      body: [
        name ? `Bonjour ${name},` : 'Bonjour,',
        '',
        driver
          ? `Votre chauffeur ${driver} a été assigné à la réservation #${bookingRef}.`
          : `Un chauffeur a été assigné à la réservation #${bookingRef}.`,
        phone ? `Contact chauffeur : ${phone}` : null,
        'VIPCAR vous souhaite un excellent trajet.',
      ]
        .filter((line): line is string => line != null)
        .join('\n'),
    };
  }

  return {
    subject: `[VIPCAR] Driver assigned — booking #${bookingRef}`,
    body: [
      name ? `Hello ${name},` : 'Hello,',
      '',
      driver
        ? `Your driver ${driver} has been assigned to booking #${bookingRef}.`
        : `A driver has been assigned to booking #${bookingRef}.`,
      phone ? `Driver contact: ${phone}` : null,
      'VIPCAR wishes you a pleasant trip.',
    ]
      .filter((line): line is string => line != null)
      .join('\n'),
  };
}

export function renderTripStatus(
  event: Pick<
    DispatchTripStatusEventDto,
    'bookingId' | 'customerName' | 'locale' | 'status'
  >,
  locale: LocaleLabel = event.locale ?? 'en',
): RenderedMessage {
  const bookingRef = event.bookingId.slice(0, 8);
  const name = event.customerName?.trim() || null;

  if (locale === 'fr') {
    const { subject, line } = tripCopyFr(event.status, bookingRef);
    return {
      subject,
      body: [
        name ? `Bonjour ${name},` : 'Bonjour,',
        '',
        line,
        'VIPCAR — service premium.',
      ].join('\n'),
    };
  }

  const { subject, line } = tripCopyEn(event.status, bookingRef);
  return {
    subject,
    body: [
      name ? `Hello ${name},` : 'Hello,',
      '',
      line,
      'VIPCAR — premium service.',
    ].join('\n'),
  };
}

function tripCopyEn(
  status: DispatchTripStatusEventDto['status'],
  bookingRef: string,
): { subject: string; line: string } {
  switch (status) {
    case 'en_route':
      return {
        subject: `[VIPCAR] Driver en route — booking #${bookingRef}`,
        line: `Your driver is en route for booking #${bookingRef}.`,
      };
    case 'arrived':
      return {
        subject: `[VIPCAR] Driver arrived — booking #${bookingRef}`,
        line: `Your driver has arrived for booking #${bookingRef}.`,
      };
    case 'completed':
      return {
        subject: `[VIPCAR] Trip completed — booking #${bookingRef}`,
        line: `Your trip for booking #${bookingRef} is complete. Thank you for choosing VIPCAR.`,
      };
  }
}

function tripCopyFr(
  status: DispatchTripStatusEventDto['status'],
  bookingRef: string,
): { subject: string; line: string } {
  switch (status) {
    case 'en_route':
      return {
        subject: `[VIPCAR] Chauffeur en route — réservation #${bookingRef}`,
        line: `Votre chauffeur est en route pour la réservation #${bookingRef}.`,
      };
    case 'arrived':
      return {
        subject: `[VIPCAR] Chauffeur arrivé — réservation #${bookingRef}`,
        line: `Votre chauffeur est arrivé pour la réservation #${bookingRef}.`,
      };
    case 'completed':
      return {
        subject: `[VIPCAR] Trajet terminé — réservation #${bookingRef}`,
        line: `Votre trajet pour la réservation #${bookingRef} est terminé. Merci d’avoir choisi VIPCAR.`,
      };
  }
}
