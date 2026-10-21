import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEventRole } from "@/lib/checkin/queries";
import { getEvent } from "@/lib/events/queries";
import { THEME_PRESETS, resolveAccent } from "@/lib/events/theme";
import { loadLog, loadSummary } from "@/lib/raffle/queries";
import { winnersOf } from "@/lib/raffle/records";
import { createClient } from "@/lib/supabase/server";
import { RaffleStage } from "./raffle-stage";

export const metadata: Metadata = { title: "Raffle stage" };

type Props = PageProps<"/dashboard/events/[eventId]/raffle/stage">;

export default function StagePage(props: Props) {
  return (
    // The stage covers the whole screen, so even its loading state does.
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-ink" aria-hidden="true" />}>
      <Stage params={props.params} />
    </Suspense>
  );
}

async function Stage({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  if (!(await getEventRole(event))) notFound();

  const supabase = await createClient();
  const [summary, log] = await Promise.all([loadSummary(supabase, event.id), loadLog(supabase, event.id)]);
  if (!summary.ok) throw new Error(`Could not load the raffle: ${summary.error.message}`);
  if (!log.ok) throw new Error(`Could not load the raffle log: ${log.error.message}`);

  // The stage is what the audience sees, so it wears the Event Theme.
  const preset = THEME_PRESETS[event.theme.preset];
  const theme = {
    background: preset.background,
    surface: preset.surface,
    text: preset.text,
    muted: preset.muted,
    accent: resolveAccent(event.theme),
    serif: event.theme.font === "classic",
  };

  return (
    <RaffleStage
      eventId={event.id}
      eventName={event.name}
      theme={theme}
      backHref={`/dashboard/events/${event.id}/raffle`}
      prizes={summary.value.prizes}
      remaining={summary.value.remaining}
      winners={winnersOf(log.value)}
    />
  );
}
