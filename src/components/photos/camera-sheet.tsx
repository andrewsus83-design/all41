"use client";

import { Camera, Images, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { canvasFromVideo } from "@/lib/photos/canvas";

type Facing = "user" | "environment";

/**
 * The live camera, full screen, in the brand kit's camera pattern: the event's
 * frame around the view, a close button on top, a glass panel with the shutter
 * below. If the camera cannot open (no permission, no camera, not https) the
 * gallery button is still there.
 */
export function CameraSheet({
  onCapture,
  onPickFile,
  onClose,
}: {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onPickFile: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [state, setState] = useState<"starting" | "live" | "unavailable">("starting");
  const [canFlip, setCanFlip] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1);
          setState("live");
        }
      } catch {
        if (!cancelled) setState("unavailable");
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, stop]);

  const take = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = canvasFromVideo(video, facing === "user");
    stop();
    onCapture(canvas);
  };

  const mirrored = facing === "user";

  return (
    <div role="dialog" aria-modal="true" aria-label="Camera" className="fixed inset-0 z-50 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""} ${state === "live" ? "" : "invisible"}`}
      />
      {/* the event's frame, as in the brand kit's camera */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-4 rounded-3xl border-[10px] opacity-80"
        style={{ borderColor: "var(--ev-accent)" }}
      />

      <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-5">
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
          aria-label="Close the camera"
          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md scale-on-click"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {canFlip && state === "live" && (
          <button
            type="button"
            onClick={() => {
              setState("starting");
              setFacing((current) => (current === "user" ? "environment" : "user"));
            }}
            aria-label="Switch camera"
            className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md scale-on-click"
          >
            <SwitchCamera className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 text-center">
        {state === "starting" && <p className="text-sm text-white/80">Opening the camera…</p>}
        {state === "unavailable" && (
          <div className="max-w-xs space-y-2 rounded-3xl bg-black/70 p-6 backdrop-blur-md">
            <p className="font-display text-lg font-semibold text-white">The camera did not open</p>
            <p className="text-sm text-zinc-300">
              Allow camera access for this page in your browser, or choose a photo from your gallery instead.
            </p>
          </div>
        )}
      </div>

      <div className="glass-panel relative z-10 flex items-center justify-between gap-4 rounded-t-[2.5rem] px-8 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <label className="flex size-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-zinc-800 text-white scale-on-click focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-neon-cyan">
          <Images className="size-5" aria-hidden="true" />
          <span className="text-[10px] font-bold">Gallery</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose a photo from your gallery"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                stop();
                onPickFile(file);
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={take}
          disabled={state !== "live"}
          aria-label="Take the photo"
          className="flex size-20 items-center justify-center rounded-full border-4 border-white/80 p-1 scale-on-click disabled:opacity-40"
        >
          <span className="flex size-full items-center justify-center rounded-full bg-neon-cyan text-black shadow-neon">
            <Camera className="size-7" aria-hidden="true" />
          </span>
        </button>
        <span className="size-14" aria-hidden="true" />
      </div>
    </div>
  );
}
