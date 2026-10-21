import {
  EXTRA_GUEST_BLOCK_SIZE,
  MAX_SELF_SERVICE_GUESTS,
  PACKAGES,
  WHITE_LABEL_PRICE_IDR,
  getPackage,
  type PackageDef,
  type PackageTier,
  type WhatsAppProvider,
} from './catalog';

export type PricingErrorCode =
  | 'invalid_quantity'
  | 'extra_guests_not_available'
  | 'whatsapp_not_available';

export class PricingError extends Error {
  constructor(
    readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PricingError';
  }
}

export interface QuoteInput {
  tier: PackageTier;
  /** Blocks of {@link EXTRA_GUEST_BLOCK_SIZE} extra guests. */
  extraGuestBlocks?: number;
  whatsapp?: WhatsAppProvider;
  whiteLabel?: boolean;
}

export type QuoteLineKind = 'package' | 'extra_guests' | 'whatsapp' | 'white_label';

export interface QuoteLine {
  kind: QuoteLineKind;
  label: string;
  quantity: number;
  unitPriceIdr: number;
  amountIdr: number;
}

export interface Quote {
  lines: QuoteLine[];
  /** Guests the event can hold: package capacity plus extra guests. */
  capacity: number;
  totalIdr: number;
  /** Package plus extra guests: the amount referral cashback is calculated on. */
  cashbackBaseIdr: number;
}

export function quote(input: QuoteInput): Quote {
  const pkg = getPackage(input.tier);
  const blocks = input.extraGuestBlocks ?? 0;
  if (!Number.isInteger(blocks) || blocks < 0) {
    throw new PricingError('invalid_quantity', 'Extra guest blocks must be a whole number of 0 or more.');
  }

  const lines: QuoteLine[] = [
    { kind: 'package', label: `${pkg.name} package`, quantity: 1, unitPriceIdr: pkg.priceIdr, amountIdr: pkg.priceIdr },
  ];

  if (blocks > 0) {
    if (pkg.extraGuestPriceIdr === null) {
      throw new PricingError('extra_guests_not_available', `${pkg.name} cannot buy extra guests.`);
    }
    const guests = blocks * EXTRA_GUEST_BLOCK_SIZE;
    lines.push({
      kind: 'extra_guests',
      label: 'Extra guests',
      quantity: guests,
      unitPriceIdr: pkg.extraGuestPriceIdr,
      amountIdr: guests * pkg.extraGuestPriceIdr,
    });
  }

  const cashbackBaseIdr = lines.reduce((sum, line) => sum + line.amountIdr, 0);

  if (input.whatsapp) {
    if (pkg.whatsappIdr === null) {
      throw new PricingError('whatsapp_not_available', `${pkg.name} cannot add WhatsApp.`);
    }
    const price = pkg.whatsappIdr[input.whatsapp];
    const provider = input.whatsapp === 'fonnte' ? 'Fonnte' : 'official';
    lines.push({
      kind: 'whatsapp',
      label: `WhatsApp add-on (${provider})`,
      quantity: 1,
      unitPriceIdr: price,
      amountIdr: price,
    });
  }

  if (input.whiteLabel) {
    lines.push({
      kind: 'white_label',
      label: 'White label add-on',
      quantity: 1,
      unitPriceIdr: WHITE_LABEL_PRICE_IDR,
      amountIdr: WHITE_LABEL_PRICE_IDR,
    });
  }

  return {
    lines,
    capacity: pkg.guestCapacity + blocks * EXTRA_GUEST_BLOCK_SIZE,
    totalIdr: lines.reduce((sum, line) => sum + line.amountIdr, 0),
    cashbackBaseIdr,
  };
}

/** The smallest package that holds `guests` without extra guests, or null above 2,500. */
export function smallestPackageFor(guests: number): PackageDef | null {
  assertGuestCount(guests);
  return PACKAGES.find((p) => guests <= p.guestCapacity) ?? null;
}

export interface Plan {
  tier: PackageTier;
  extraGuestBlocks: number;
  totalIdr: number;
}

/**
 * The cheapest package plus extra guests that holds `guests`; on a tie the
 * larger package wins. Null above 2,500 (contact us).
 */
export function cheapestPlan(guests: number): Plan | null {
  assertGuestCount(guests);
  if (guests > MAX_SELF_SERVICE_GUESTS) return null;

  let best: Plan | null = null;
  for (const pkg of PACKAGES) {
    const missing = Math.max(0, guests - pkg.guestCapacity);
    if (missing > 0 && pkg.extraGuestPriceIdr === null) continue;

    const extraGuestBlocks = Math.ceil(missing / EXTRA_GUEST_BLOCK_SIZE);
    const totalIdr = pkg.priceIdr + extraGuestBlocks * EXTRA_GUEST_BLOCK_SIZE * (pkg.extraGuestPriceIdr ?? 0);
    if (best === null || totalIdr <= best.totalIdr) {
      best = { tier: pkg.tier, extraGuestBlocks, totalIdr };
    }
  }
  return best;
}

function assertGuestCount(guests: number): void {
  if (!Number.isInteger(guests) || guests < 1) {
    throw new PricingError('invalid_quantity', 'Guest count must be a whole number of 1 or more.');
  }
}
