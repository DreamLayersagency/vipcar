/** TND → millimes (1 TND = 1000 millimes). Used by Konnect and Flouci. */
export function tndToMillimes(amountTnd: number): number {
  if (!Number.isFinite(amountTnd) || amountTnd < 0) {
    throw new Error(`Invalid TND amount: ${amountTnd}`);
  }
  return Math.round(amountTnd * 1000);
}
