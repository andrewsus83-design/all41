export const PACKAGE_TIERS = ['free', 'starter', 'plus', 'pro', 'business', 'scale'] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];

export type WhatsAppProvider = 'fonnte' | 'official';

export interface PackageDef {
  tier: PackageTier;
  name: string;
  guestCapacity: number;
  priceIdr: number;
  /** null: extra guests cannot be bought for this package */
  extraGuestPriceIdr: number | null;
  /** null: the WhatsApp add-on is not sold for this package */
  whatsappIdr: Record<WhatsAppProvider, number> | null;
}

/**
 * Must match the seed of `public.a41_packages` in supabase/migrations; a test
 * compares the two so the app and the database cannot drift apart.
 */
export const PACKAGES: readonly PackageDef[] = [
  { tier: 'free', name: 'Free', guestCapacity: 5, priceIdr: 0, extraGuestPriceIdr: null, whatsappIdr: null },
  {
    tier: 'starter',
    name: 'Starter',
    guestCapacity: 50,
    priceIdr: 150_000,
    extraGuestPriceIdr: 3_000,
    whatsappIdr: { fonnte: 50_000, official: 100_000 },
  },
  {
    tier: 'plus',
    name: 'Plus',
    guestCapacity: 300,
    priceIdr: 750_000,
    extraGuestPriceIdr: 2_500,
    whatsappIdr: { fonnte: 250_000, official: 300_000 },
  },
  {
    tier: 'pro',
    name: 'Pro',
    guestCapacity: 600,
    priceIdr: 1_350_000,
    extraGuestPriceIdr: 2_250,
    whatsappIdr: { fonnte: 400_000, official: 600_000 },
  },
  {
    tier: 'business',
    name: 'Business',
    guestCapacity: 1_500,
    priceIdr: 3_000_000,
    extraGuestPriceIdr: 2_000,
    whatsappIdr: { fonnte: 800_000, official: 1_500_000 },
  },
  {
    tier: 'scale',
    name: 'Scale',
    guestCapacity: 2_500,
    priceIdr: 4_500_000,
    extraGuestPriceIdr: null,
    whatsappIdr: { fonnte: 1_200_000, official: 2_500_000 },
  },
];

/** Extra guests are sold in blocks of this many guests. */
export const EXTRA_GUEST_BLOCK_SIZE = 10;

/** White label / bring-your-own-domain add-on, per event. */
export const WHITE_LABEL_PRICE_IDR = 250_000;

/** Above the largest package an event is quoted by hand (contact us). */
export const MAX_SELF_SERVICE_GUESTS = 2_500;

export function getPackage(tier: PackageTier): PackageDef {
  const found = PACKAGES.find((p) => p.tier === tier);
  if (!found) throw new Error(`Unknown package tier: ${tier}`);
  return found;
}

export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
