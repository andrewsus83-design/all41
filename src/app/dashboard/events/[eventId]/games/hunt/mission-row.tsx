"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/games/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { HuntHostBoard } from "@/lib/games/schemas";
import { deleteMission, setMissionActive } from "../actions";
import { MissionForm } from "./mission-form";

type Mission = HuntHostBoard["missions"][number];

export function MissionRow({ eventId, mission, canEdit }: { eventId: string; mission: Mission; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <Card className="space-y-4 border-gold/40 p-6 sm:p-8">
          <h4 className="font-display text-lg font-semibold">Edit mission</h4>
          <MissionForm eventId={eventId} missionId={mission.id} mission={mission} onDone={() => setEditing(false)} />
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className={`p-5 sm:p-6 ${mission.active ? "" : "opacity-70"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-72 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-lg font-semibold break-words">{mission.title}</p>
              <Badge tone="gold">{mission.points.toLocaleString("en-US")} pts</Badge>
              {!mission.active && <Badge>Paused</Badge>}
            </div>
            {mission.hint && <p className="text-sm text-muted">{mission.hint}</p>}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                Code <code className="rounded-lg bg-surface px-2 py-1 font-mono tracking-widest text-fg">{mission.code}</code>
              </span>
              <span className="tabular-nums">
                Found by {mission.found} {mission.found === 1 ? "guest" : "guests"}
              </span>
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton variant="secondary" action={() => setMissionActive(eventId, mission.id, !mission.active)}>
                {mission.active ? "Pause" : "Resume"}
              </ActionButton>
              <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Edit ${mission.title}`}>
                <Pencil className="size-4" aria-hidden /> Edit
              </Button>
              <ActionButton variant="ghost" confirm="Delete this mission and the points it gave?" action={() => deleteMission(eventId, mission.id)} aria-label={`Delete ${mission.title}`}>
                <Trash2 className="size-4" aria-hidden />
              </ActionButton>
            </div>
          )}
        </div>
      </Card>
    </li>
  );
}
