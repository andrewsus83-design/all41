import { describe, expect, it } from 'vitest';
import {
  CASHBACK_MIN_PAYOUT_IDR,
  PACKAGES,
  PricingError,
  cashbackAmountIdr,
  cashbackRate,
  cheapestPlan,
  formatIdr,
  quote,
  smallestPackageFor,
} from './index';

describe('smallestPackageFor', () => {
  it.each([
    [1, 'free'],
    [5, 'free'],
    [6, 'starter'],
    [50, 'starter'],
    [51, 'plus'],
    [300, 'plus'],
    [301, 'pro'],
    [600, 'pro'],
    [601, 'business'],
    [1500, 'business'],
    [1501, 'scale'],
    [2500, 'scale'],
  ])('%i guests fit the %s package', (guests, tier) => {
    expect(smallestPackageFor(guests)?.tier).toBe(tier);
  });

  it('returns null above 2,500 guests (contact us)', () => {
    expect(smallestPackageFor(2501)).toBeNull();
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects %s guests', (guests) => {
    expect(() => smallestPackageFor(guests)).toThrow(PricingError);
  });
});

describe('quote', () => {
  it('prices Starter with extra guests as in the profile (65 guests = 20 extra)', () => {
    const q = quote({ tier: 'starter', extraGuestBlocks: 2 });
    expect(q.totalIdr).toBe(210_000);
    expect(q.capacity).toBe(70);
  });

  it('adds WhatsApp and white label on top, but not into the cashback base', () => {
    const q = quote({ tier: 'pro', whatsapp: 'fonnte', whiteLabel: true });
    expect(q.totalIdr).toBe(1_350_000 + 400_000 + 250_000);
    expect(q.cashbackBaseIdr).toBe(1_350_000);
    expect(q.lines.map((l) => l.kind)).toEqual(['package', 'whatsapp', 'white_label']);
  });

  it('uses the official WhatsApp price when asked', () => {
    expect(quote({ tier: 'plus', whatsapp: 'official' }).totalIdr).toBe(750_000 + 300_000);
  });

  it('includes extra guests in the cashback base', () => {
    const q = quote({ tier: 'plus', extraGuestBlocks: 3 });
    expect(q.cashbackBaseIdr).toBe(750_000 + 30 * 2_500);
  });

  it('refuses extra guests for Free and Scale', () => {
    for (const tier of ['free', 'scale'] as const) {
      expect(() => quote({ tier, extraGuestBlocks: 1 })).toThrow(
        expect.objectContaining({ code: 'extra_guests_not_available' }),
      );
    }
  });

  it('refuses WhatsApp for Free', () => {
    expect(() => quote({ tier: 'free', whatsapp: 'fonnte' })).toThrow(
      expect.objectContaining({ code: 'whatsapp_not_available' }),
    );
  });

  it.each([-1, 1.5, Number.NaN])('refuses %s extra guest blocks', (blocks) => {
    expect(() => quote({ tier: 'starter', extraGuestBlocks: blocks })).toThrow(
      expect.objectContaining({ code: 'invalid_quantity' }),
    );
  });
});

describe('cheapestPlan', () => {
  it.each([
    [5, 'free', 0, 0],
    [6, 'starter', 0, 150_000],
    [51, 'starter', 1, 180_000],
    [65, 'starter', 2, 210_000],
    [240, 'starter', 19, 720_000],
    [300, 'plus', 0, 750_000],
    [1500, 'business', 0, 3_000_000],
    [1501, 'business', 1, 3_020_000],
    [2500, 'scale', 0, 4_500_000],
  ])('%i guests: %s with %i extra blocks costs %i', (guests, tier, blocks, total) => {
    expect(cheapestPlan(guests)).toEqual({ tier, extraGuestBlocks: blocks, totalIdr: total });
  });

  it.each([
    [250, 'plus'],
    [540, 'pro'],
    [2250, 'scale'],
  ])('at the break-even of %i guests the larger package wins (%s)', (guests, tier) => {
    expect(cheapestPlan(guests)?.tier).toBe(tier);
  });

  it('is null above 2,500 guests', () => {
    expect(cheapestPlan(2501)).toBeNull();
  });

  it('never gets cheaper as guests are added and always holds every guest', () => {
    let previous = 0;
    for (let guests = 1; guests <= 2500; guests++) {
      const plan = cheapestPlan(guests);
      expect(plan).not.toBeNull();
      const q = quote({ tier: plan!.tier, extraGuestBlocks: plan!.extraGuestBlocks });
      expect(q.totalIdr).toBe(plan!.totalIdr);
      expect(q.capacity).toBeGreaterThanOrEqual(guests);
      expect(plan!.totalIdr).toBeGreaterThanOrEqual(previous);
      previous = plan!.totalIdr;
    }
  });

  it('is never dearer than the plain package for the same guest count', () => {
    for (let guests = 1; guests <= 2500; guests++) {
      expect(cheapestPlan(guests)!.totalIdr).toBeLessThanOrEqual(smallestPackageFor(guests)!.priceIdr);
    }
  });
});

describe('cashback', () => {
  it.each([
    [99, { kind: 'none' }],
    [100, { kind: 'rate', rate: 0.1 }],
    [499, { kind: 'rate', rate: 0.1 }],
    [500, { kind: 'rate', rate: 0.12 }],
    [999, { kind: 'rate', rate: 0.12 }],
    [1000, { kind: 'rate', rate: 0.15 }],
    [1999, { kind: 'rate', rate: 0.15 }],
    [2000, { kind: 'rate', rate: 0.18 }],
    [2500, { kind: 'rate', rate: 0.18 }],
    [2501, { kind: 'negotiated' }],
  ])('%i final guests -> %j', (guests, expected) => {
    expect(cashbackRate(guests)).toEqual(expected);
  });

  it.each([
    ['Plus with 300 guests', 300, 750_000, 75_000],
    ['Starter plus 50 extra guests (100 guests)', 100, 150_000 + 50 * 3_000, 30_000],
    ['Plus plus 30 extra guests (330 guests)', 330, 750_000 + 30 * 2_500, 82_500],
    ['Pro with 600 guests', 600, 1_350_000, 162_000],
    ['Business with 1,500 guests', 1500, 3_000_000, 450_000],
    ['Scale with 2,500 guests', 2500, 4_500_000, 810_000],
  ])('matches the profile example: %s', (_label, guests, base, expected) => {
    expect(cashbackAmountIdr(guests, base)).toBe(expected);
  });

  it('pays nothing below 100 guests and leaves large events to negotiation', () => {
    expect(cashbackAmountIdr(99, 150_000)).toBe(0);
    expect(cashbackAmountIdr(3000, 9_000_000)).toBeNull();
  });

  it('needs a single Plus event of 300 guests to be topped up before payout', () => {
    expect(cashbackAmountIdr(300, 750_000)!).toBeLessThan(CASHBACK_MIN_PAYOUT_IDR);
  });
});

describe('catalog', () => {
  it('has strictly growing capacity and price', () => {
    for (let i = 1; i < PACKAGES.length; i++) {
      expect(PACKAGES[i].guestCapacity).toBeGreaterThan(PACKAGES[i - 1].guestCapacity);
      expect(PACKAGES[i].priceIdr).toBeGreaterThan(PACKAGES[i - 1].priceIdr);
    }
  });

  it('formats rupiah with dots', () => {
    expect(formatIdr(1_350_000)).toBe('Rp 1.350.000');
    expect(formatIdr(0)).toBe('Rp 0');
  });
});
