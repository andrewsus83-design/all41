import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { capacityOf } from "@/lib/events/capacity";
import { countGuests, getEvent } from "@/lib/events/queries";
import { getEventRole, loadStats } from "@/lib/checkin/queries";
import { createClient } from "@/lib/supabase/server";
import { CheckinConsole } from "./checkin-console";

export const metadata: Metadata = { title: "Check-in" };

type Props = PageProps<"/dashboard/events/[eventId]/checkin">;

export default function CheckinPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <Checkin params={props.params} />
    </Suspense>
  );
}

async function Checkin({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const role = await getEventRole(event);
  if (!role) notFound();

  const supabase = await createClient();
  const [stats, guestCount] = await Promise.all([loadStats(supabase, event.id), countGuests(supabase, event.id)]);
  if (!stats.ok) throw new Error(`Could not load the check-in numbers: ${stats.error.message}`);

  return (
    <div className="space-y-5">
      {event.status !== "published" && (
        <p className="rounded-2xl border border-line-strong bg-panel px-4 py-3 text-sm text-muted">
          {event.status === "draft"
            ? "This event is still a draft, so guests cannot open their invitations yet. Check-in works against the guest list all the same."
            : "This event is archived."}
        </p>
      )}
      <CheckinConsole
        eventId={event.id}
        timeZone={event.timezone}
        initialStats={stats.value}
        canUndo={role === "owner"}
        canAddWalkIn={role === "owner"}
        guestListFull={capacityOf(event, guestCount).full}
      />
    </div>
  );
}
