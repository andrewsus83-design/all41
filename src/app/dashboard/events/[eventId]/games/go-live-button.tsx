"use client";

import { Radio } from "lucide-react";
import { ActionButton } from "@/components/games/action-button";
import { openLobby } from "./actions";

/** Opens the lobby of a quiz and goes to the big screen. */
export function GoLiveButton({ eventId, quizId, label = "Go live" }: { eventId: string; quizId: string; label?: string }) {
  return (
    <ActionButton variant="neon" action={() => openLobby(eventId, quizId)}>
      <Radio className="size-4" aria-hidden /> {label}
    </ActionButton>
  );
}
