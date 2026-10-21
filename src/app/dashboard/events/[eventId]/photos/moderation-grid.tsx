"use client";

import { Check, EyeOff, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoragePhoto } from "@/components/photos/storage-photo";
import { formatBytes, formatPhotoTime } from "@/lib/photos/format";
import type { ModerationPhoto } from "@/lib/photos/records";
import { photoUrl } from "@/lib/photos/urls";
import { deletePhoto, setPhotoStatus } from "./actions";

type Tab = "pending" | "approved" | "rejected";

/** The photos of one tab, each with what the host can do with it. Staff see the same grid without the buttons. */
export function ModerationGrid({
  eventId,
  tab,
  photos,
  canModerate,
  timezone,
}: {
  eventId: string;
  tab: Tab;
  photos: ModerationPhoto[];
  canModerate: boolean;
  timezone: string;
}) {
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const hide = useCallback((id: string) => setGone((ids) => new Set(ids).add(id)), []);
  const visible = photos.filter((photo) => !gone.has(photo.id));
  const enlarged = visible.find((photo) => photo.id === open) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((photo) => (
          <PhotoTile
            key={photo.id}
            eventId={eventId}
            tab={tab}
            photo={photo}
            canModerate={canModerate}
            timezone={timezone}
            onEnlarge={() => setOpen(photo.id)}
            onDone={() => hide(photo.id)}
          />
        ))}
      </ul>

      {enlarged && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close the photo"
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white scale-on-click"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <StoragePhoto
            src={photoUrl(enlarged.path)}
            alt={`Photo from ${enlarged.guestName}`}
            loading="eager"
            className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <p className="mt-3 text-sm text-zinc-300">
            {enlarged.guestName} · {formatPhotoTime(enlarged.createdAt, timezone)}
          </p>
        </div>
      )}
    </>
  );
}

const TAB_BADGE = {
  pending: { label: "Waiting", tone: "warning" },
  approved: { label: "On the wall", tone: "cyan" },
  rejected: { label: "Hidden", tone: "danger" },
} as const;

function PhotoTile({
  eventId,
  tab,
  photo,
  canModerate,
  timezone,
  onEnlarge,
  onDone,
}: {
  eventId: string;
  tab: Tab;
  photo: ModerationPhoto;
  canModerate: boolean;
  timezone: string;
  onEnlarge: () => void;
  onDone: () => void;
}) {
  const [busy, startWorking] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const badge = TAB_BADGE[tab];

  const run = (work: () => Promise<{ error?: string }>) => {
    setError(undefined);
    startWorking(async () => {
      const result = await work();
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  return (
    <li className="space-y-2">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-line bg-surface">
        <button type="button" onClick={onEnlarge} aria-label={`Enlarge the photo from ${photo.guestName}`} className="block w-full">
          <StoragePhoto src={photoUrl(photo.path)} alt="" className="aspect-[3/4] w-full object-cover" />
        </button>
        <div className="pointer-events-none absolute top-2 left-2">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>
      <div className="px-1 text-sm">
        <p className="truncate font-medium">{photo.guestName}</p>
        <p className="text-muted">
          {formatPhotoTime(photo.createdAt, timezone)} · {formatBytes(photo.bytes)}
        </p>
      </div>

      {canModerate &&
        (confirming ? (
          <div className="space-y-2">
            <p className="px-1 text-xs text-muted">Delete this photo for good?</p>
            <div className="flex gap-2">
              <Button variant="danger" className="h-10 flex-1 px-3!" disabled={busy} onClick={() => run(() => deletePhoto(eventId, photo.id))}>
                {busy ? "Deleting…" : "Delete"}
              </Button>
              <Button variant="ghost" className="h-10 px-3!" disabled={busy} onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {tab !== "approved" && (
              <Button variant="neon" className="h-10 min-w-0 flex-1 px-2!" disabled={busy} onClick={() => run(() => setPhotoStatus(eventId, photo.id, "approved"))}>
                <Check className="hidden size-4 sm:block" aria-hidden="true" />
                Approve
              </Button>
            )}
            {tab === "pending" && (
              <Button variant="secondary" className="h-10 w-10 shrink-0 px-0!" disabled={busy} aria-label="Reject this photo" title="Reject" onClick={() => run(() => setPhotoStatus(eventId, photo.id, "rejected"))}>
                <X className="size-4" aria-hidden="true" />
              </Button>
            )}
            {tab === "approved" && (
              <Button variant="secondary" className="h-10 flex-1 px-3!" disabled={busy} onClick={() => run(() => setPhotoStatus(eventId, photo.id, "rejected"))}>
                <EyeOff className="size-4" aria-hidden="true" />
                Take down
              </Button>
            )}
            <Button variant="ghost" className="h-10 w-10 shrink-0 px-0! text-danger hover:text-danger" disabled={busy} aria-label="Delete this photo" title="Delete" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      {error && (
        <p role="alert" className="px-1 text-xs text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
