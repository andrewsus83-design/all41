"use client";

import { ActionButton } from "@/components/games/action-button";
import { resetHuntScores } from "../actions";

export function ResetScoresButton({ eventId }: { eventId: string }) {
  return (
    <ActionButton variant="secondary" confirm="Clear every guest's points?" action={() => resetHuntScores(eventId)}>
      Reset all scores
    </ActionButton>
  );
}
