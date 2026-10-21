"use client";

import { Camera, Check, Download, Images, LoaderCircle, RefreshCw, Share2, Trash2, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { removePhotoAction } from "@/app/i/[token]/photos/actions";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventTheme } from "@/lib/events/theme";
import { canvasFromFile } from "@/lib/photos/canvas";
import type { PhotoFormat } from "@/lib/photos/limits";
import { PHOTO_RETENTION_DAYS } from "@/lib/photos/limits";
import type { MyPhoto, PhotoStatus } from "@/lib/photos/records";
import { photoFileName, photoUrl } from "@/lib/photos/urls";
import { CameraSheet } from "./camera-sheet";
import { eventPalette } from "./event-look";
import { sharePhoto } from "./photo-actions";
import { PhotoEditor } from "./photo-editor";
import { StoragePhoto } from "./storage-photo";
import { useUploadQueue, type UploadItem } from "./use-upload-queue";

const STATUS_LABEL: Record<PhotoStatus, { label: string; tone: BadgeTone }> = {
  approved: { label: "On the wall", tone: "cyan" },
  pending: { label: "Waiting for approval", tone: "warning" },
  rejected: { label: "Not shown", tone: "danger" },
  removed: { label: "Removed", tone: "neutral" },
};

const STEP_LABEL: Record<Exclude<UploadItem["state"], "failed">, string> = {
  waiting: "Waiting…",
  ticket: "Getting ready…",
  uploading: "Sending…",
  saving: "Saving…",
};

export interface PhotoBoothProps {
  token: string;
  eventName: string;
  eventSlug: string;
  firstName: string;
  dateLabel: string;
  theme: EventTheme;
  enabled: boolean;
  uploadsOpen: boolean;
  moderation: "auto" | "manual";
  consentedAt: string | null;
  quota: number;
  initialPhotos: MyPhoto[];
  albumHref: string;
  /** Where a shared photo points when the phone can only share a link: the public event page, never the guest's own link. */
  shareUrl: string;
}

/** The guest's photo page: take or pick a photo, see what happens to it, share, download or remove it. */
export function PhotoBooth(props: PhotoBoothProps) {
  const { token, eventName, eventSlug, firstName, dateLabel, theme, enabled, uploadsOpen, moderation, quota, albumHref, shareUrl } = props;
  const [photos, setPhotos] = useState<MyPhoto[]>(props.initialPhotos);
  const [agreed, setAgreed] = useState(props.consentedAt !== null);
  const [mode, setMode] = useState<"home" | "camera" | "edit">("home");
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [notice, setNotice] = useState<string>();
  const [readError, setReadError] = useState<string>();
  const palette = eventPalette(theme);

  const onSaved = useCallback(
    (photo: MyPhoto) => {
      setPhotos((list) => [photo, ...list.filter((existing) => existing.id !== photo.id)]);
      setNotice(
        photo.status === "approved"
          ? "Your photo is on the big screen!"
          : "Photo sent. It shows on the big screen once the host approves it.",
      );
    },
    [],
  );

  const queue = useUploadQueue({ token, consent: agreed, onSaved });
  const used = photos.length + queue.items.length;
  const left = Math.max(0, quota - used);
  const canAdd = enabled && uploadsOpen && left > 0;
  const ready = canAdd && agreed;

  const pickFile = async (file: File) => {
    setReadError(undefined);
    try {
      setSource(await canvasFromFile(file));
      setMode("edit");
    } catch {
      setMode("home");
      setReadError("We could not read that file. Please choose a photo.");
    }
  };

  const send = (blob: Blob, format: PhotoFormat) => {
    queue.enqueue(blob, format);
    setSource(null);
    setMode("home");
    setNotice(undefined);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-8 pb-20">
      <header className="space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--ev-accent)" }}>
          Photo wall
        </p>
        <h1 className="text-3xl leading-tight font-semibold break-words" style={{ fontFamily: "var(--ev-heading)" }}>
          {eventName}
        </h1>
        <p className="text-sm" style={{ color: "var(--ev-muted)" }}>
          {dateLabel}
        </p>
        <p style={{ color: "var(--ev-muted)" }}>
          Hi {firstName}! Take a photo with the event frame.{" "}
          {moderation === "manual" ? "The host approves each photo before it shows on the big screen." : "It shows on the big screen right away."}
        </p>
      </header>

      {!enabled && (
        <Notice tone="warning">The photo wall is not open for this event.</Notice>
      )}
      {enabled && !uploadsOpen && <Notice tone="warning">Photos can no longer be added to this event. You can still see and download yours.</Notice>}

      {canAdd && !props.consentedAt && (
        <section className="space-y-3 rounded-[2rem] border border-white/10 p-5" style={{ background: "var(--ev-surface)" }}>
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 size-6 shrink-0 accent-[var(--ev-accent)]"
            />
            <span className="text-sm leading-relaxed">
              I agree that photos I take here, which may show my face, are shown on the big screen and to the other guests of {eventName},
              and that they can download them. I can remove my photos at any time. Photos are deleted {PHOTO_RETENTION_DAYS} days after they are taken.
            </span>
          </label>
        </section>
      )}

      {canAdd && (
        <section className="space-y-3" aria-label="Add a photo">
          <Button variant="neon" size="lg" className="w-full" disabled={!ready} onClick={() => setMode("camera")}>
            <Camera className="size-6" aria-hidden="true" />
            Open camera
          </Button>
          <label
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] border border-line-strong text-lg font-bold scale-on-click focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neon-cyan ${
              ready ? "cursor-pointer" : "pointer-events-none opacity-50"
            }`}
          >
            <Images className="size-5" aria-hidden="true" />
            Choose from gallery
            <input
              type="file"
              accept="image/*"
              disabled={!ready}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) pickFile(file);
              }}
            />
          </label>
          {!agreed && <p className="text-sm text-zinc-400">Tick the box above to take photos.</p>}
          <p className="text-sm text-zinc-400" aria-live="polite">
            {left === 0 ? "You have used all your photos." : `${left} of ${quota} photos left.`}
          </p>
        </section>
      )}

      {readError && <Notice tone="danger">{readError}</Notice>}
      {notice && (
        <div role="status" className="flex items-center gap-4 rounded-2xl border border-neon-cyan/30 bg-surface p-4 shadow-neon">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neon-cyan/15 text-neon-cyan">
            <Check className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">{notice}</p>
        </div>
      )}

      {queue.items.length > 0 && (
        <ul className="space-y-3" aria-label="Photos being sent">
          {queue.items.map((item) => (
            <UploadRow key={item.key} item={item} onRetry={() => queue.retry(item.key)} onDiscard={() => queue.discard(item.key)} />
          ))}
        </ul>
      )}

      <section className="space-y-4" aria-labelledby="your-photos">
        <div className="flex items-end justify-between gap-3">
          <h2 id="your-photos" className="text-xl font-semibold" style={{ fontFamily: "var(--ev-heading)" }}>
            Your photos
          </h2>
          {enabled && (
            <Link href={albumHref} className="text-sm font-bold underline-offset-4 hover:underline" style={{ color: "var(--ev-accent)" }}>
              Shared album
            </Link>
          )}
        </div>
        {photos.length === 0 ? (
          <p className="rounded-[2rem] border border-dashed border-white/15 p-6 text-center text-sm" style={{ color: "var(--ev-muted)" }}>
            Photos you take show up here.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {photos.map((photo) => (
              <MyPhotoTile
                key={photo.id}
                token={token}
                photo={photo}
                eventSlug={eventSlug}
                eventName={eventName}
                shareUrl={shareUrl}
                onRemoved={() => setPhotos((list) => list.filter((existing) => existing.id !== photo.id))}
              />
            ))}
          </ul>
        )}
      </section>

      {mode === "camera" && (
        <CameraSheet
          onClose={() => setMode("home")}
          onCapture={(canvas) => {
            setSource(canvas);
            setMode("edit");
          }}
          onPickFile={pickFile}
        />
      )}
      {mode === "edit" && source && (
        <PhotoEditor
          source={source}
          palette={palette}
          title={eventName}
          subtitle={dateLabel}
          onSend={send}
          onRetake={() => {
            setSource(null);
            setMode("camera");
          }}
        />
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "warning" | "danger"; children: string }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "danger" ? "border-danger/30 bg-danger/10 text-danger" : "border-warning/30 bg-warning/10 text-warning"
      }`}
    >
      {children}
    </p>
  );
}

function UploadRow({ item, onRetry, onDiscard }: { item: UploadItem; onRetry: () => void; onDiscard: () => void }) {
  const failed = item.state === "failed";
  const step = item.state === "failed" ? undefined : STEP_LABEL[item.state];
  return (
    <li className={`flex items-center gap-4 rounded-2xl border p-3 ${failed ? "border-danger/30 bg-danger/10" : "border-white/10 bg-surface"}`}>
      <StoragePhoto src={item.previewUrl} alt="" loading="eager" className="size-16 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        {failed ? (
          <>
            <p className="flex items-center gap-2 text-sm font-bold text-danger">
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              Not sent yet
            </p>
            <p className="text-sm text-zinc-300">{item.message}</p>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm font-bold" role="status">
            <LoaderCircle className="size-4 shrink-0 animate-spin text-neon-cyan" aria-hidden="true" />
            {step}
            {item.attempt > 1 && <span className="font-normal text-zinc-400">(try {item.attempt})</span>}
          </p>
        )}
      </div>
      {failed && (
        <div className="flex shrink-0 gap-2">
          {!item.final && (
            <Button size="md" variant="secondary" onClick={onRetry} aria-label="Try sending this photo again">
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry
            </Button>
          )}
          <Button size="md" variant="ghost" onClick={onDiscard} aria-label="Discard this photo">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </li>
  );
}

function MyPhotoTile({
  token,
  photo,
  eventSlug,
  eventName,
  shareUrl,
  onRemoved,
}: {
  token: string;
  photo: MyPhoto;
  eventSlug: string;
  eventName: string;
  shareUrl: string;
  onRemoved: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const status = STATUS_LABEL[photo.status];
  const fileName = photoFileName(eventSlug, photo.createdAt, photo.path);

  const remove = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await removePhotoAction(token, photo.id);
      if (result.ok) return onRemoved();
      setMessage(result.message);
    } catch {
      setMessage("No connection. Please try again.");
    }
    setBusy(false);
    setConfirming(false);
  };

  const share = async () => {
    const result = await sharePhoto(photo.path, fileName, eventName, shareUrl);
    if (result === "copied") setMessage("Event link copied.");
    if (result === "failed") setMessage("Sharing did not work on this device. Use Download instead.");
  };

  return (
    <li className="space-y-2">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-surface">
        <StoragePhoto src={photoUrl(photo.path)} alt="One of your photos" className="aspect-[3/4] w-full object-cover" />
        <div className="absolute top-2 left-2">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>
      {photo.status === "rejected" && <p className="text-xs text-zinc-400">The host did not approve this photo for the wall.</p>}
      {confirming ? (
        <div className="flex gap-2">
          <Button variant="danger" className="h-10 flex-1 px-3" onClick={remove} disabled={busy}>
            {busy ? "Removing…" : "Remove"}
          </Button>
          <Button variant="ghost" className="h-10 px-3" onClick={() => setConfirming(false)} disabled={busy}>
            Keep
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <a
            href={photoUrl(photo.path, { download: fileName })}
            download={fileName}
            aria-label="Download this photo"
            className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-line-strong text-white scale-on-click"
          >
            <Download className="size-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={share}
            aria-label="Share this photo"
            className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-line-strong text-white scale-on-click"
          >
            <Share2 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Remove this photo"
            className="flex h-10 flex-1 items-center justify-center rounded-2xl border border-danger/30 text-danger scale-on-click"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-xs text-zinc-300">
          {message}
        </p>
      )}
    </li>
  );
}
