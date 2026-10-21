import { MAX_SELF_SERVICE_GUESTS } from './catalog';

/** Events below this many guests in the guest list earn no cashback. */
export const CASHBACK_MIN_GUESTS = 100;

/** Referrers can only withdraw once their balance reaches this amount. */
export const CASHBACK_MIN_PAYOUT_IDR = 100_000;

const CASHBACK_BANDS = [
  { fromGuests: 2_000, rate: 0.18 },
  { fromGuests: 1_000, rate: 0.15 },
  { fromGuests: 500, rate: 0.12 },
  { fromGuests: CASHBACK_MIN_GUESTS, rate: 0.1 },
] as const;

export type CashbackRate =
  | { kind: 'none' }
  | { kind: 'rate'; rate: number }
  /** Above the largest package; agreed by hand. */
  | { kind: 'negotiated' };

/** `finalGuests` is the number of guests in the guest list when the event ends. */
export function cashbackRate(finalGuests: number): CashbackRate {
  if (finalGuests > MAX_SELF_SERVICE_GUESTS) return { kind: 'negotiated' };
  const band = CASHBACK_BANDS.find((b) => finalGuests >= b.fromGuests);
  return band ? { kind: 'rate', rate: band.rate } : { kind: 'none' };
}

/**
 * Cashback for the referrer. `baseIdr` is the paid package plus extra guests;
 * add-ons are not included. Returns null when the amount is not automatic.
 */
export function cashbackAmountIdr(finalGuests: number, baseIdr: number): number | null {
  const result = cashbackRate(finalGuests);
  if (result.kind === 'negotiated') return null;
  if (result.kind === 'none') return 0;
  return Math.round(baseIdr * result.rate);
}
