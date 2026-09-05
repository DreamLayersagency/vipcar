export const DOMAIN_EVENTS = {
  identityUserRegistered: 'identity.user.registered',
  bookingQuoteCreated: 'booking.quote.created',
  bookingQuotePriced: 'booking.quote.priced',
  bookingConfirmed: 'booking.confirmed',
  bookingCancelled: 'booking.cancelled',
  bookingStarted: 'booking.started',
  bookingCompleted: 'booking.completed',
  billingPaymentCaptured: 'billing.payment.captured',
  billingPaymentFailed: 'billing.payment.failed',
  billingDepositReleased: 'billing.deposit.released',
  dispatchAssigned: 'dispatch.assigned',
  /** Trip progress for notify (en_route | arrived | completed). */
  dispatchTripStatus: 'dispatch.trip.status.changed',
  dispatchTripCompleted: 'dispatch.trip.completed',
} as const;
