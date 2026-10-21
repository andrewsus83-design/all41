import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadStats } from "@/lib/checkin/queries";
import { createClient } from "@/lib/supabase/server";

/** The door at a glance on the event overview, read from the same function the check-in screen polls. */
export async function CheckinSummaryCard({ eventId }: { eventId: string }) {
  const supabase = await createClient();
  const result = await loadStats(supabase, eventId, 1);
  if (!result.ok) return null;

  const { checkedIn, attending, attendingCheckedIn, totalGuests } = result.value;
  const share = attending === 0 ? 0 : Math.min(100, Math.round((attendingCheckedIn / attending) * 100));

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">Check-in</h2>
        <Link href={`/dashboard/events/${eventId}/checkin`} className={buttonStyles({ variant: "secondary" })}>
          Open check-in
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <p>
          <span className="font-display text-4xl font-bold text-gold tabular-nums">{checkedIn.toLocaleString("en-US")}</span>
          <span className="ml-2 text-muted">checked in of {totalGuests.toLocaleString("en-US")} on the list</span>
        </p>
        <p className="text-muted">
          <span className="font-bold text-fg tabular-nums">{attendingCheckedIn.toLocaleString("en-US")}</span> of{" "}
          <span className="tabular-nums">{attending.toLocaleString("en-US")}</span> who said yes have arrived
        </p>
      </div>
      <div
        role="meter"
        aria-label="Guests who said yes and have arrived"
        aria-valuemin={0}
        aria-valuemax={attending}
        aria-valuenow={attendingCheckedIn}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${share}%` }} />
      </div>
    </Card>
  );
}
