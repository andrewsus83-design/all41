import type { Capacity } from "@/lib/events/capacity";

/** How much of the guest list the package allows is used. */
export function CapacityMeter({ capacity, compact = false }: { capacity: Capacity; compact?: boolean }) {
  const { used, total, remaining, fraction, full, nearlyFull } = capacity;
  const fill = full ? "bg-danger" : nearlyFull ? "bg-warning" : "bg-gold";
  // A sliver is always visible once anyone is on the list.
  const width = used === 0 ? 0 : Math.max(2, Math.round(fraction * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          <span className="font-medium tabular-nums">{used.toLocaleString("en-US")}</span>
          <span className="text-muted"> of {total.toLocaleString("en-US")} guests</span>
        </span>
        {!compact && (
          <span className={full ? "text-danger" : "text-muted"}>
            {full ? "List is full" : `${remaining.toLocaleString("en-US")} left`}
          </span>
        )}
      </div>
      <div
        role="meter"
        aria-label="Guest list capacity"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        className={`${compact ? "mt-1.5 h-1.5" : "mt-2 h-2"} overflow-hidden rounded-full bg-line`}
      >
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
