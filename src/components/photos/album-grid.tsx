"use client";

import { ChevronLeft, ChevronRight, Download, LoaderCircle, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { loadAlbumPageAction } from "@/app/i/[token]/photos/actions";
import { Button } from "@/components/ui/button";
import type { AlbumPhoto } from "@/lib/photos/records";
import { photoFileName, photoUrl } from "@/lib/photos/urls";
import { sharePhoto } from "./photo-actions";
import { StoragePhoto } from "./storage-photo";

/** The shared album: a grid of everyone's approved photos, a viewer with download and share, and more on request. */
export function AlbumGrid({
  token,
  eventSlug,
  eventName,
  shareUrl,
  initialPhotos,
  initialHasMore,
}: {
  token: string;
  eventSlug: string;
  eventName: string;
  shareUrl: string;
  initialPhotos: AlbumPhoto[];
  initialHasMore: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState<string>();

  const loadMore = async () => {
    const last = photos[photos.length - 1];
    if (!last) return;
    setLoading(true);
    setProblem(undefined);
    try {
      const page = await loadAlbumPageAction(token, { approvedAt: last.approvedAt, id: last.id });
      setPhotos((list) => [...list, ...page.photos.filter((photo) => !list.some((existing) => existing.id === photo.id))]);
      setHasMore(page.hasMore);
    } catch {
      setProblem("No connection. Please try again.");
    }
    setLoading(false);
  };

  const close = useCallback(() => {
    setOpen(null);
    setMessage(undefined);
  }, []);
  const step = useCallback(
    (direction: 1 | -1) => {
      setMessage(undefined);
      setOpen((current) => (current === null ? null : Math.min(photos.length - 1, Math.max(0, current + direction))));
    },
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  const current = open === null ? null : photos[open];
  const nameOf = (photo: AlbumPhoto) => photoFileName(eventSlug, photo.approvedAt, photo.path);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Open photo ${index + 1}`}
              className="block aspect-square w-full overflow-hidden rounded-2xl bg-surface scale-on-click"
            >
              <StoragePhoto src={photoUrl(photo.path)} alt="" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? "Loading…" : "Show more"}
          </Button>
          {problem && (
            <p role="alert" className="text-sm text-danger">
              {problem}
            </p>
          )}
        </div>
      )}

      {current && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              onClick={close}
              aria-label="Close the viewer"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white scale-on-click"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <p className="text-sm text-zinc-300" aria-live="polite">
              {(open ?? 0) + 1} of {photos.length}
              {hasMore ? "+" : ""}
            </p>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            <StoragePhoto
              src={photoUrl(current.path)}
              alt={`Photo ${(open ?? 0) + 1} from ${eventName}`}
              loading="eager"
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {(open ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute left-3 flex size-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md scale-on-click"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
            )}
            {(open ?? 0) < photos.length - 1 && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute right-3 flex size-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md scale-on-click"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="glass-panel flex gap-3 rounded-t-[2.5rem] px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <a
              href={photoUrl(current.path, { download: nameOf(current) })}
              download={nameOf(current)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-gold bg-surface font-bold text-gold scale-on-click"
            >
              <Download className="size-5" aria-hidden="true" />
              Download
            </a>
            <button
              type="button"
              onClick={async () => {
                const result = await sharePhoto(current.path, nameOf(current), eventName, shareUrl);
                if (result === "copied") setMessage("Event link copied.");
                if (result === "failed") setMessage("Sharing did not work here. Use Download instead.");
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-neon-cyan font-bold text-black shadow-neon scale-on-click"
            >
              <Share2 className="size-5" aria-hidden="true" />
              Share
            </button>
          </div>
          {message && (
            <p role="status" className="bg-black px-6 pb-4 text-center text-sm text-zinc-300">
              {message}
            </p>
          )}
        </div>
      )}
    </>
  );
}
