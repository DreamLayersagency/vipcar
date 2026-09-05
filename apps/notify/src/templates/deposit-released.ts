import type { DepositReleasedEventDto, LocaleLabel } from '@vipcar/contracts';

export type RenderedMessage = {
  subject: string;
  body: string;
};

export function renderDepositReleased(
  event: Pick<
    DepositReleasedEventDto,
    'payment' | 'bookingId' | 'customerName' | 'locale'
  >,
  locale: LocaleLabel = event.locale ?? 'en',
): RenderedMessage {
  const amount = formatTnd(event.payment.amountTnd);
  const bookingRef = event.bookingId.slice(0, 8);
  const name = event.customerName?.trim() || null;

  if (locale === 'fr') {
    return {
      subject: `[VIPCAR] Caution libérée — réservation #${bookingRef}`,
      body: [
        name ? `Bonjour ${name},` : 'Bonjour,',
        '',
        `Votre caution de ${amount} TND pour la réservation #${bookingRef} a été libérée.`,
        'Merci d’avoir choisi VIPCAR.',
      ].join('\n'),
    };
  }

  return {
    subject: `[VIPCAR] Deposit released — booking #${bookingRef}`,
    body: [
      name ? `Hello ${name},` : 'Hello,',
      '',
      `Your deposit of ${amount} TND for booking #${bookingRef} has been released.`,
      'Thank you for choosing VIPCAR.',
    ].join('\n'),
  };
}

function formatTnd(amount: number): string {
  return Number(amount).toFixed(3);
}
