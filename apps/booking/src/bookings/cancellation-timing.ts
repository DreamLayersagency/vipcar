import type { BookingStatus } from '../../generated/prisma';

/**
 * Stub cancellation timing rules until structured fields exist on CMS legal pages.
 * Customer free-cancel requires at least this many hours before `startAt`
 * once the booking is `confirmed`. Pre-confirm statuses are always within window.
 */
export const STUB_FREE_CANCEL_HOURS_BEFORE_START = 24;

export type CancellationTimingRules = {
  source: 'stub';
  freeCancelHoursBeforeStart: number;
  appliesFromStatus: 'confirmed';
};

export const STUB_CANCELLATION_TIMING: CancellationTimingRules = {
  source: 'stub',
  freeCancelHoursBeforeStart: STUB_FREE_CANCEL_HOURS_BEFORE_START,
  appliesFromStatus: 'confirmed',
};

export type CancellationWindowCheck = {
  withinWindow: boolean;
  hoursUntilStart: number;
  freeCancelHoursBeforeStart: number;
  rulesSource: 'stub';
};

/** Hours (fractional) from `now` until booking start. Negative if start is past. */
export function hoursUntil(startAt: Date, now: Date = new Date()): number {
  return (startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Pre-confirm statuses may always cancel. Confirmed bookings need
 * `freeCancelHoursBeforeStart` hours remaining before `startAt`.
 */
export function checkCancellationWindow(
  status: BookingStatus,
  startAt: Date,
  now: Date = new Date(),
  rules: CancellationTimingRules = STUB_CANCELLATION_TIMING,
): CancellationWindowCheck {
  const remaining = hoursUntil(startAt, now);

  if (status !== rules.appliesFromStatus) {
    return {
      withinWindow: true,
      hoursUntilStart: remaining,
      freeCancelHoursBeforeStart: rules.freeCancelHoursBeforeStart,
      rulesSource: rules.source,
    };
  }

  return {
    withinWindow: remaining >= rules.freeCancelHoursBeforeStart,
    hoursUntilStart: remaining,
    freeCancelHoursBeforeStart: rules.freeCancelHoursBeforeStart,
    rulesSource: rules.source,
  };
}
