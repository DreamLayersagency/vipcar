/** Redis key for a unit checkout hold — one active hold per unit. */
export function holdKey(unitId: string): string {
  return `fleet:hold:unit:${unitId}`;
}

/** Default checkout hold TTL (10 min). Clamp via FLEET_HOLD_TTL_SECONDS to 5–15 min. */
export const DEFAULT_HOLD_TTL_SECONDS = 600;
export const MIN_HOLD_TTL_SECONDS = 300;
export const MAX_HOLD_TTL_SECONDS = 900;

export type HoldPayload = {
  holdId: string;
  unitId: string;
  startAt: string;
  endAt: string;
  bookingId?: string;
  acquiredAt: string;
};

export function resolveHoldTtlSeconds(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_HOLD_TTL_SECONDS;
  }
  return Math.min(MAX_HOLD_TTL_SECONDS, Math.max(MIN_HOLD_TTL_SECONDS, Math.floor(parsed)));
}
