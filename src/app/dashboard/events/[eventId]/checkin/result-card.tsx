"use client";

import { CircleCheck, CircleX, LoaderCircle, TriangleAlert, Undo2, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { formatClock } from "@/lib/checkin/format";
import type { GuestCard } from "@/lib/checkin/records";

/** What the big card on the scanner says. */
export type DoorCard =
  | { key: number; kind: "checked_in"; guest: GuestCard; checkedInAt: string }
  | { key: number; kind: "already"; guest: GuestCard; checkedInAt: string }
  | { key: number; kind: "other_event"; eventName: string | null }
  | { key: number; kind: "unknown" }
  | { key: number; kind: "not_a_pass" }
  | { key: number; kind: "queued" }
  | { key: number; kind: "error"; message: string; retry?: () => void };

const TONES = {
  success: "bg-success text-black shadow-[0_0_40px_rgb(0_230_118/0.35)]",
  warning: "bg-warning text-black shadow-[0_0_40px_rgb(245_166_35/0.35)]",
  danger: "bg-danger text-black shadow-danger",
} as const;

/**
 * The answer for the person at the door, big enough to read at arm's length:
 * green to let the guest in, amber when they were already let in, red when
 * something is wrong. Solid colors with dark text read in bright light.
 */
export function ResultCard({
  card,
  timeZone,
  canUndo,
  onUndo,
  onDismiss,
}: {
  card: DoorCard;
  timeZone: string;
  canUndo: boolean;
  onUndo: (guestId: string) => void;
  onDismiss: () => void;
}) {
  switch (card.kind) {
    case "checked_in":
      return (
        <Shell tone="success" icon={<CircleCheck className="size-9" aria-hidden="true" />} label="Checked in" onDismiss={onDismiss}>
          <Guest guest={card.guest} />
          {canUndo && (
            <UndoButton onClick={() => onUndo(card.guest.id)} />
          )}
        </Shell>
      );
    case "already":
      return (
        <Shell
          tone="warning"
          icon={<TriangleAlert className="size-9" aria-hidden="true" />}
          label={`Already checked in at ${formatClock(card.checkedInAt, timeZone)}`}
          onDismiss={onDismiss}
        >
          <Guest guest={card.guest} />
        </Shell>
      );
    case "other_event":
      return (
        <Shell tone="danger" icon={<CircleX className="size-9" aria-hidden="true" />} label="Wrong event" onDismiss={onDismiss}>
          <p className="font-display text-2xl leading-tight font-bold">This pass is for another event</p>
          {card.eventName && <p className="text-lg font-semibold">{card.eventName}</p>}
        </Shell>
      );
    case "unknown":
      return (
        <Shell tone="danger" icon={<CircleX className="size-9" aria-hidden="true" />} label="Not on this guest list" onDismiss={onDismiss}>
          <p className="text-lg font-semibold">Look the guest up by name below, or add them as a walk-in.</p>
        </Shell>
      );
    case "not_a_pass":
      return (
        <Shell tone="danger" icon={<CircleX className="size-9" aria-hidden="true" />} label="Not a guest pass" onDismiss={onDismiss}>
          <p className="text-lg font-semibold">That QR code is not an all41 invitation.</p>
        </Shell>
      );
    case "queued":
      return (
        <Shell tone="warning" icon={<WifiOff className="size-9" aria-hidden="true" />} label="No connection" onDismiss={onDismiss}>
          <p className="text-lg font-semibold">Saved on this phone. It checks the guest in as soon as you are back online.</p>
        </Shell>
      );
    case "error":
      return (
        <Shell tone="warning" icon={<TriangleAlert className="size-9" aria-hidden="true" />} label="Could not check in" onDismiss={onDismiss}>
          <p className="text-lg font-semibold">{card.message}</p>
          {card.retry && (
            <button
              type="button"
              onClick={card.retry}
              className="mt-3 inline-flex h-12 items-center rounded-2xl bg-black/80 px-6 font-bold text-white"
            >
              Try again
            </button>
          )}
        </Shell>
      );
  }
}

function Shell({
  tone,
  icon,
  label,
  onDismiss,
  children,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  label: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={onDismiss}
      className={`flex h-full cursor-pointer flex-col justify-end gap-2 rounded-t-[2rem] p-5 ${TONES[tone]}`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <p className="font-display text-2xl leading-tight font-bold">{label}</p>
      </div>
      {children}
    </div>
  );
}

function Guest({ guest }: { guest: GuestCard }) {
  const party = guest.partySize && guest.partySize > 1 ? `Party of ${guest.partySize}` : null;
  return (
    <div className="space-y-1.5">
      <p className="font-display text-4xl leading-none font-bold break-words">{guest.name}</p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xl font-bold">
        {guest.tableNo ? <span>Table {guest.tableNo}</span> : <span className="opacity-70">No table</span>}
        {party && <span>{party}</span>}
      </p>
      {guest.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {guest.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-black/25 bg-black/10 px-3 py-0.5 text-sm font-bold">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UndoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="mt-1 inline-flex h-11 items-center gap-2 self-start rounded-2xl border border-black/30 px-4 text-sm font-bold"
    >
      <Undo2 className="size-4" aria-hidden="true" /> Undo
    </button>
  );
}

/** A small chip over the camera while an answer is on its way. */
export function CheckingChip() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-bold text-white backdrop-blur">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Checking…
    </span>
  );
}
