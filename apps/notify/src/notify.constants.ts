export const QUOTE_CREATED_TEMPLATE = 'ops.quote_created';
export const DEPOSIT_RELEASED_TEMPLATE = 'customer.deposit_released';
export const DISPATCH_ASSIGNED_TEMPLATE = 'customer.dispatch_assigned';
export const DISPATCH_TRIP_STATUS_TEMPLATE = 'customer.dispatch_trip_status';

/** Max send attempts before leaving status=failed without further auto-retry. */
export const MAX_DELIVERY_ATTEMPTS = 8;

/** Base backoff (ms) for exponential retry: 15s, 30s, 60s, … capped. */
export const RETRY_BASE_MS = 15_000;
export const RETRY_MAX_MS = 15 * 60_000;
