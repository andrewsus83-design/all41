import { getPackage, type PackageTier } from "@/lib/pricing";

export interface Capacity {
  used: number;
  /** Package capacity plus purchased extra guests. */
  total: number;
  remaining: number;
  fraction: number;
  full: boolean;
  nearlyFull: boolean;
}

/** How full an event's guest list is, against what has been paid for. */
export function capacityOf(event: { package: PackageTier; extraGuests: number }, used: number): Capacity {
  const total = getPackage(event.package).guestCapacity + event.extraGuests;
  const remaining = Math.max(0, total - used);
  return {
    used,
    total,
    remaining,
    fraction: total === 0 ? 1 : Math.min(1, used / total),
    full: remaining === 0,
    nearlyFull: remaining > 0 && used / total >= 0.9,
  };
}
