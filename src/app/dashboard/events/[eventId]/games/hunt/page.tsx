import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Leaderboard } from "@/components/games/leaderboard";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { getHuntHostBoard } from "@/lib/games/host";
import { MissionForm } from "./mission-form";
import { MissionRow } from "./mission-row";
import { ResetScoresButton } from "./reset-scores-button";

export const metadata: Metadata = { title: "Scavenger hunt" };

type Props = PageProps<"/dashboard/events/[eventId]/games/hunt">;

export default function HuntPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-panel" aria-hidden="true" />}>
      <Hunt params={props.params} />
    </Suspense>
  );
}

const MAX_MISSIONS = 50;

async function Hunt({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  const [workspace, board] = await Promise.all([getWorkspace(), getHuntHostBoard(eventId)]);
  const isOwner = workspace?.role === "owner";
  const base = `/dashboard/events/${eventId}/games`;
  const activeCount = board.missions.filter((mission) => mission.active).length;
  const totalPoints = board.missions.filter((mission) => mission.active).reduce((sum, mission) => sum + mission.points, 0);

  return (
    <div className="space-y-6">
      <Link href={base} className="text-sm text-muted hover:text-fg">
        ← Games
      </Link>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Scavenger hunt</h2>
            <p className="mt-1 max-w-2xl text-muted">
              Each mission has a secret code. Print the codes as QR stickers, hide them at the venue, and guests scan them with their phone for points.
              {event.status !== "published" && " Guests can only play once the event is published."}
            </p>
          </div>
          {board.missions.length > 0 && (
            <Link href={`${base}/hunt/print`} className={buttonStyles({ variant: "primary" })}>
              Print the QR sheet
            </Link>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Active missions", `${activeCount} of ${board.missions.length}`],
            ["Points to win", totalPoints.toLocaleString("en-US")],
            ["Guests playing", board.players.toLocaleString("en-US")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
              <dt className="text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </Card>

      <section aria-labelledby="missions-heading" className="space-y-3">
        <h3 id="missions-heading" className="font-display text-xl font-semibold">
          Missions
        </h3>
        {board.missions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">No missions yet.{isOwner ? " Add the first one below." : ""}</p>
        ) : (
          <ul className="space-y-3">
            {board.missions.map((mission) => (
              <MissionRow key={mission.id} eventId={eventId} mission={mission} canEdit={isOwner} />
            ))}
          </ul>
        )}
      </section>

      {isOwner &&
        (board.missions.length >= MAX_MISSIONS ? (
          <p className="text-sm text-muted">A hunt can have up to {MAX_MISSIONS} missions.</p>
        ) : (
          <Card className="space-y-4 p-6 sm:p-8">
            <h3 className="font-display text-lg font-semibold">Add a mission</h3>
            <MissionForm eventId={eventId} missionId={null} />
          </Card>
        ))}

      <Card className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-display text-lg font-semibold">Standings</h3>
          {isOwner && board.leaderboard.length > 0 && <ResetScoresButton eventId={eventId} />}
        </div>
        <Leaderboard rows={board.leaderboard} empty="Nobody has found a mission yet." />
      </Card>
    </div>
  );
}
