"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Chromium and Safari ship BarcodeDetector in some versions; TypeScript's DOM
// types do not know it yet. jsQR reads the frames where it is missing.
type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

type Status = "starting" | "scanning" | "denied" | "unavailable";

const FRAMES_PER_SECOND = 8;
const MAX_FRAME_WIDTH = 640;

/**
 * Reads QR codes with the phone camera. Calls `onScan` with the text of each code,
 * and again for the same code only after `cooldownMs`, so holding the camera over
 * one pass does not fire twice. `paused` releases the camera, for example while a
 * result is on screen.
 */
export function QrScanner({
  onScan,
  paused = false,
  cooldownMs = 3000,
  frame = true,
}: {
  onScan: (text: string) => void;
  paused?: boolean;
  cooldownMs?: number;
  /** Draws the plain white viewfinder. Pass false to draw your own over the camera. */
  frame?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState<Status>("starting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (paused) return;

    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastText = "";
    let lastAt = 0;

    const Detector = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : undefined;
    const canvas = document.createElement("canvas");

    async function read(video: HTMLVideoElement): Promise<string | undefined> {
      if (detector) {
        const [code] = await detector.detect(video);
        return code?.rawValue;
      }
      const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return undefined;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data;
    }

    async function tick(video: HTMLVideoElement) {
      if (stopped) return;
      try {
        if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          const text = await read(video);
          const now = Date.now();
          if (text && (text !== lastText || now - lastAt > cooldownMs)) {
            lastText = text;
            lastAt = now;
            onScanRef.current(text);
          }
        }
      } catch {
        // A frame that cannot be read is skipped; the next one is tried.
      }
      if (!stopped) timer = setTimeout(() => void tick(video), 1000 / FRAMES_PER_SECOND);
    }

    const opening = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false })
      : Promise.reject(new DOMException("No camera API", "NotSupportedError"));

    opening
      .then(async (opened) => {
        const video = videoRef.current;
        if (stopped || !video) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        video.srcObject = opened;
        await video.play();
        setStatus("scanning");
        void tick(video);
      })
      .catch((error: unknown) => {
        if (stopped) return;
        const name = error instanceof DOMException ? error.name : "";
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [paused, cooldownMs, attempt]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} muted playsInline aria-label="Camera view" className="size-full object-cover" />
        {status === "scanning" && frame && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-white/70" />
        )}
        {status === "starting" && !paused && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Starting the camera…</p>
        )}
        {paused && <p className="absolute inset-0 grid place-items-center text-sm text-white/80">Camera paused</p>}
      </div>
      {status === "denied" && (
        <div role="alert" className="space-y-2 text-sm text-danger">
          <p>The camera is blocked. Allow camera access for this site in the browser settings, then try again.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setStatus("starting");
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {status === "unavailable" && (
        <p role="alert" className="text-sm text-danger">
          This browser cannot open the camera here. The camera needs a secure (https) page and a device with a camera.
        </p>
      )}
    </div>
  );
}
