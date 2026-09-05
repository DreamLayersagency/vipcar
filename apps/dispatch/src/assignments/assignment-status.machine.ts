import type { AssignmentStatus } from '../../generated/prisma';

/**
 * Trip progress transitions (docs/domain/entities.md AssignmentStatus):
 * assigned → en_route → arrived → completed
 * en_route may skip arrived → completed.
 */
const ALLOWED: Readonly<
  Partial<Record<AssignmentStatus, readonly AssignmentStatus[]>>
> = {
  assigned: ['en_route'],
  en_route: ['arrived', 'completed'],
  arrived: ['completed'],
};

export function canTripTransition(
  from: AssignmentStatus,
  to: AssignmentStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}
