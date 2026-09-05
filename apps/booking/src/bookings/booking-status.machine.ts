import type { BookingStatus } from '../../generated/prisma';

/**
 * Allowed BookingStatus transitions (docs/domain/entities.md):
 *
 * quote_requested → quoted → awaiting_payment → confirmed → in_progress → completed
 * quote_requested / quoted / awaiting_payment / confirmed → cancelled
 * confirmed / in_progress → no_show
 */
const ALLOWED: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  quote_requested: ['quoted', 'cancelled'],
  quoted: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function allowedTargets(from: BookingStatus): readonly BookingStatus[] {
  return ALLOWED[from];
}
