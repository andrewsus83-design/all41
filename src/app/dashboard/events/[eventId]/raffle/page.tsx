import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEventRole } from "@/lib/checkin/queries";
import { getEvent } from "@/lib/events/queries";
import { loadLog, loadSummary } from "@/lib/raffle/queries";
import { MAX_PRIZES } from "@/lib/raffle/records";
import { createClient } from "@/lib/supabase/server";
import { AuditLog } from "./audit-log";
import { PrizeManager } from "./prize-manager";

export const metadata: Metadata = { title: "Raffle" };

type Props = PageProps<"/dashboard/events/[eventId]/raffle">;

export default function RafflePage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <Raffle params={props.params} />
    </Suspense>
  );
}

async function Raffle({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const role = await getEventRole(event);
  if (!role) notFound();

  const supabase = await createClient();
  const [summary, log] = await Promise.all([loadSummary(supabase, event.id), loadLog(supabase, event.id)]);
  if (!summary.ok) throw new Error(`Could not load the raffle: ${summary.error.message}`);
  if (!log.ok) throw new Error(`Could not load the raffle log: ${log.error.message}`);

  const { prizes, remaining, checkedIn } = summary.value;
  const winners = log.value.filter((entry) => entry.status === "won");
  const byPrize = prizes
    .map((prize) => ({ prize, winners: winners.filter((entry) => entry.prizeId === prize.id).reverse() }))
    .filter((group) => group.winners.length > 0);
  const stage = `/dashboard/events/${event.id}/raffle/stage`;
  const open = prizes.some((prize) => prize.awarded < prize.quantity);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold">Door prize raffle</h2>
          <p className="max-w-xl text-muted">
            The winner is drawn by the server, at random, from guests who have checked in. Show the stage on the big screen and tap Draw.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <dl className="flex gap-6">
            <div>
              <dd className="font-display text-3xl font-bold tabular-nums">{checkedIn.toLocaleString("en-US")}</dd>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">Checked in</dt>
            </div>
            <div>
              <dd className="font-display text-3xl font-bold text-neon-cyan tabular-nums">{remaining.toLocaleString("en-US")}</dd>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">In the draw</dt>
            </div>
            <div>
              <dd className="font-display text-3xl font-bold tabular-nums">{winners.length.toLocaleString("en-US")}</dd>
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">Winners</dt>
            </div>
          </dl>
          {prizes.length > 0 ? (
            <Link href={stage} className={buttonStyles({ variant: "neon", size: "lg" })}>
              Open the stage
            </Link>
          ) : null}
        </div>
      </Card>

      {prizes.length > 0 && open && remaining === 0 && (
        <p role="status" className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Nobody is in the draw yet. Guests join it when they check in, and a guest who has already been drawn is not drawn again.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <PrizeManager eventId={event.id} prizes={prizes} canManage={role === "owner"} atLimit={prizes.length >= MAX_PRIZES} />

        <Card className="space-y-4 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Winners</h2>
          {byPrize.length === 0 ? (
            <p className="text-muted">No winners yet.</p>
          ) : (
            <ul className="space-y-5">
              {byPrize.map(({ prize, winners: list }) => (
                <li key={prize.id} className="space-y-2">
                  <p className="flex items-center justify-between gap-3 font-bold">
                    <span className="break-words">{prize.name}</span>
                    <Badge tone={prize.awarded >= prize.quantity ? "success" : "cyan"}>
                      {prize.awarded}/{prize.quantity}
                    </Badge>
                  </p>
                  <ul className="space-y-1 text-sm">
                    {list.map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-3">
                        <span className="break-words">{entry.guestName}</span>
                        <span className="shrink-0 text-muted">{entry.guestTableNo ? `Table ${entry.guestTableNo}` : "No table"}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AuditLog entries={log.value} timeZone={event.timezone} />
    </div>
  );
}
