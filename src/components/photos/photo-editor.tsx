"use client";

import { ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UPLOAD_MAX_EDGE, drawPhoto, shrinkCanvas, type FrameDecor } from "@/lib/photos/canvas";
import { encodeUnderLimit } from "@/lib/photos/encode";
import { PHOTO_FILTERS, type PhotoFilterId } from "@/lib/photos/filters";
import type { PhotoFormat } from "@/lib/photos/limits";
import type { EventPalette } from "./event-look";

/** The font family the page loaded for headings, as the canvas needs it by name. */
function headingFamily(serif: boolean): string {
  if (serif) return "Georgia, 'Times New Roman', serif";
  const loaded = getComputedStyle(document.documentElement).getPropertyValue("--font-outfit").trim();
  return loaded ? `${loaded}, system-ui, sans-serif` : "system-ui, sans-serif";
}

/** Draws a filter's name on a small preview of the photo, so choosing a look is choosing from pictures. */
function FilterChip({
  source,
  id,
  label,
  selected,
  onSelect,
}: {
  source: HTMLCanvasElement;
  id: PhotoFilterId;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvasRef.current;
    if (!target) return;
    const small = drawPhoto(source, { filter: id, frame: null, maxEdge: 120 });
    target.width = small.width;
    target.height = small.height;
    target.getContext("2d")?.drawImage(small, 0, 0);
  }, [source, id]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1.5 scale-on-click ${
        selected ? "bg-white/15 ring-2 ring-neon-cyan" : "bg-white/5"
      }`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="size-14 rounded-xl object-cover" />
      <span className="text-[11px] font-bold text-white">{label}</span>
    </button>
  );
}

/**
 * After the shot: pick a look, keep or drop the event frame, then send. The
 * picture that is uploaded is drawn here at full size and encoded to stay under
 * 2 MB; the preview is the same drawing, smaller.
 */
export function PhotoEditor({
  source,
  palette,
  title,
  subtitle,
  onSend,
  onRetake,
}: {
  source: HTMLCanvasElement;
  palette: EventPalette;
  title: string;
  subtitle: string;
  onSend: (blob: Blob, format: PhotoFormat) => void;
  onRetake: () => void;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<PhotoFilterId>("none");
  const [framed, setFramed] = useState(true);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string>();

  const decor = useMemo<FrameDecor>(
    () => ({
      background: palette.background,
      accent: palette.accent,
      text: palette.text,
      muted: palette.muted,
      title,
      subtitle,
      fontFamily: "",
    }),
    [palette, title, subtitle],
  );

  // The heading font loads on first use; draw once it is there so the caption does not change under the guest.
  const [fontFamily, setFontFamily] = useState("");
  useEffect(() => {
    let cancelled = false;
    const family = headingFamily(palette.serif);
    document.fonts
      ?.load(`700 40px ${family}`)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFontFamily(family);
      });
    return () => {
      cancelled = true;
    };
  }, [palette.serif]);

  useEffect(() => {
    const target = previewRef.current;
    if (!target || !fontFamily) return;
    const picture = drawPhoto(source, { filter, frame: framed ? { ...decor, fontFamily } : null, maxEdge: 960 });
    target.width = picture.width;
    target.height = picture.height;
    target.getContext("2d")?.drawImage(picture, 0, 0);
  }, [source, filter, framed, decor, fontFamily]);

  const send = async () => {
    setSending(true);
    setProblem(undefined);
    try {
      const picture = drawPhoto(source, {
        filter,
        frame: framed ? { ...decor, fontFamily } : null,
        maxEdge: UPLOAD_MAX_EDGE,
      });
      const encoded = await encodeUnderLimit(picture, (canvas, factor) => shrinkCanvas(canvas as HTMLCanvasElement, factor));
      if (!encoded) {
        setProblem("We could not prepare this photo. Please take it again.");
        setSending(false);
        return;
      }
      onSend(encoded.blob, encoded.format);
    } catch {
      setProblem("We could not prepare this photo. Please take it again.");
      setSending(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit your photo" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-5">
        <button
          type="button"
          onClick={onRetake}
          disabled={sending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold text-white scale-on-click"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retake
        </button>
        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-full bg-white/10 px-4 text-sm font-bold text-white">
          <input
            type="checkbox"
            checked={framed}
            onChange={(event) => setFramed(event.target.checked)}
            className="size-5 accent-[var(--ev-accent)]"
          />
          Event frame
        </label>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-5">
        <canvas ref={previewRef} aria-label="Preview of your photo" role="img" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
      </div>

      <div className="glass-panel space-y-5 rounded-t-[2.5rem] px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div role="group" aria-label="Filters" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
          {PHOTO_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              source={source}
              id={option.id}
              label={option.label}
              selected={filter === option.id}
              onSelect={() => setFilter(option.id)}
            />
          ))}
        </div>
        {problem && (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {problem}
          </p>
        )}
        <Button variant="neon" size="lg" className="w-full" onClick={send} disabled={sending || !fontFamily}>
          {sending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
          {sending ? "Preparing…" : "Send photo"}
        </Button>
      </div>
    </div>
  );
}
