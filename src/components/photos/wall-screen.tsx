"use client";

import { Camera, ImageOff, LinkIcon, Maximize, Minimize, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { EventTheme } from "@/lib/events/theme";
import { photoUrl } from "@/lib/photos/urls";
import {
  EMPTY_WALL,
  WALL_DWELL_MS,
  WALL_MIN_DWELL_MS,
  WALL_MOSAIC_MIN,
  WALL_POLL_MS,
  advance,
  applyFeed,
  mosaicGrid,
  mosaicOf,
  parseWallPoll,
  type WallPhoto,
  type WallPoll,
} from "@/lib/photos/wall-rotation";
import { eventLookStyle } from "./event-look";
import { StoragePhoto } from "./storage-photo";

type Link = "live" | "retrying" | "gone";

/** The slowest the screen asks while the network is down. */
const MAX_BACKOFF_MS = 30_000;
/** How long an old photo stays under the new one while it fades in. */
const FADE_MS = 1400;

/**
 * The venue screen: one photo in the spotlight, the newest ones in a mosaic
 * beside it, no scrolling at any size. It asks the feed route for news every
 * few seconds, shows new photos first, and keeps going on whatever it already
 * has when the network drops.
 */
export function WallScreen({
  slug,
  wallKey,
  eventName,
  theme,
  initial,
  eventUrl,
  qr,
}: {
  slug: string;
  wallKey: string;
  eventName: string;
  theme: EventTheme;
  initial: WallPoll;
  /** The public event page, shown as text beside its QR code. */
  eventUrl: string;
  /** The QR code of that page, drawn on the server. */
  qr: ReactNode;
}) {
  const [wall, setWall] = useState(() => applyFeed(EMPTY_WALL, initial.photos));
  const [info, setInfo] = useState({ enabled: initial.enabled, total: initial.total });
  const [link, setLink] = useState<Link>("live");
  const shownAt = useRef(0);

  // Ask for news. A failure keeps what is on screen and tries again, slower each time.
  useEffect(() => {
    let stopped = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function poll() {
      controller = new AbortController();
      const abort = setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch(`/wall/${encodeURIComponent(slug)}/${encodeURIComponent(wallKey)}/feed`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404) {
          // The link was replaced or the event closed: nothing to wait for.
          setLink("gone");
          return;
        }
        const answer = response.ok ? parseWallPoll(await response.json()) : null;
        if (!answer) throw new Error("bad answer");
        failures = 0;
        setLink("live");
        setInfo({ enabled: answer.enabled, total: answer.total });
        setWall((state) => applyFeed(state, answer.photos));
      } catch {
        if (stopped) return;
        failures += 1;
        setLink("retrying");
      } finally {
        clearTimeout(abort);
      }
      if (!stopped) timer = setTimeout(poll, Math.min(MAX_BACKOFF_MS, WALL_POLL_MS * 2 ** Math.min(failures, 4)));
    }

    timer = setTimeout(poll, WALL_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [slug, wallKey]);

  // Remember when the current photo came up, then move on after its time. A
  // new photo waits only until the current one has been seen for a while.
  const hasFresh = wall.fresh.length > 0;
  const rotating = wall.photos.length > 1 || hasFresh;
  useEffect(() => {
    shownAt.current = Date.now();
  }, [wall.currentId]);
  useEffect(() => {
    if (!rotating) return;
    const elapsed = Date.now() - shownAt.current;
    const delay = Math.max(0, (hasFresh ? WALL_MIN_DWELL_MS : WALL_DWELL_MS) - elapsed);
    const timer = setTimeout(() => setWall(advance), delay);
    return () => clearTimeout(timer);
  }, [wall.currentId, hasFresh, rotating]);

  useWakeLock();
  const { visible, fullscreen, toggleFullscreen } = useScreenControls();

  const current = wall.photos.find((photo) => photo.id === wall.currentId) ?? null;
  const mosaic = info.enabled ? mosaicOf(wall.photos) : [];
  const grid = mosaicGrid(mosaic.length);
  const showMosaic = mosaic.length >= WALL_MOSAIC_MIN;

  return (
    <main
      className={`relative flex h-dvh w-full flex-col overflow-hidden ${visible ? "" : "cursor-none"}`}
      style={eventLookStyle(theme)}
    >
      <header className="flex shrink-0 items-end justify-between gap-[3vmin] px-[3vmin] pt-[2.6vmin]">
        <div className="min-w-0">
          <p className="text-[1.7vmin] font-bold tracking-[0.3em] uppercase" style={{ color: "var(--ev-accent)" }}>
            Photo wall
          </p>
          <h1 className="truncate text-[4.6vmin] leading-tight font-semibold" style={{ fontFamily: "var(--ev-heading)" }}>
            {eventName}
          </h1>
        </div>
        <div className="flex shrink-0 items-end gap-[2vmin]">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Leave full screen" : "Show full screen"}
            className={`flex size-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-opacity duration-300 focus-visible:opacity-100 ${
              visible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {fullscreen ? <Minimize className="size-6" aria-hidden="true" /> : <Maximize className="size-6" aria-hidden="true" />}
          </button>
          <div className="flex flex-col items-end gap-[0.6vmin] text-right">
            {info.enabled && info.total > 0 && (
              <p className="text-[3vmin] leading-none font-semibold tabular-nums" style={{ fontFamily: "var(--ev-heading)" }}>
                {info.total.toLocaleString("en-US")} {info.total === 1 ? "photo" : "photos"}
              </p>
            )}
            <LinkStatus link={link} />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-[2.4vmin] p-[2.4vmin] pt-[2vmin] portrait:flex-col">
        <section
          aria-label="Photo in the spotlight"
          className="relative min-w-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10"
          style={{ background: "var(--ev-surface)" }}
        >
          {link === "gone" ? (
            <Message icon={<LinkIcon />} title="This wall link no longer works" body="Ask the host for the current wall link." />
          ) : !info.enabled ? (
            <Message icon={<ImageOff />} title="The photo wall is not on yet" body="The host switches it on in the dashboard. This screen starts by itself." />
          ) : current ? (
            <Spotlight photo={current} onBroken={() => setWall(advance)} />
          ) : (
            <Message
              icon={<Camera />}
              title="Photos appear here"
              body="Open your invitation link, tap Photos and take the first picture."
            />
          )}
        </section>

        {link !== "gone" && (
          <div className="flex w-[34vw] shrink-0 flex-col gap-[1.4vmin] portrait:w-full">
            {showMosaic && (
              <ul
                aria-label="Latest photos"
                className="grid min-h-0 flex-1 gap-[1.4vmin] portrait:hidden"
                style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))` }}
              >
                {mosaic.map((photo, index) => (
                  <li
                    key={photo.id}
                    className="overflow-hidden rounded-[2rem] border border-white/10 transition duration-700 starting:scale-90 starting:opacity-0 motion-reduce:transition-none"
                    style={{
                      background: "var(--ev-surface)",
                      boxShadow: photo.id === wall.currentId ? "0 0 0 0.45vmin var(--ev-accent)" : undefined,
                      gridColumn: index === mosaic.length - 1 && grid.lastSpan > 1 ? `span ${grid.lastSpan}` : undefined,
                    }}
                  >
                    <StoragePhoto src={photoUrl(photo.path)} alt="" className="size-full object-cover" />
                  </li>
                ))}
              </ul>
            )}
            <aside
              className={`flex items-center gap-[2.4vmin] rounded-[2rem] border border-white/10 p-[2vmin] ${showMosaic ? "shrink-0" : "flex-1 flex-col justify-center text-center portrait:flex-none portrait:flex-row portrait:text-left"}`}
              style={{ background: "var(--ev-surface)" }}
            >
              <div className={`shrink-0 overflow-hidden rounded-2xl [&_svg]:size-full ${showMosaic ? "size-[14vmin]" : "size-[26vmin] portrait:size-[14vmin]"}`}>{qr}</div>
              <div className="min-w-0">
                <p className="text-[2.6vmin] leading-tight font-semibold" style={{ fontFamily: "var(--ev-heading)" }}>
                  Scan for the event page
                </p>
                <p className="mt-[0.6vmin] truncate text-[1.7vmin]" style={{ color: "var(--ev-muted)" }}>
                  {eventUrl.replace(/^https?:\/\//, "")}
                </p>
                <p className="mt-[0.6vmin] text-[1.7vmin]" style={{ color: "var(--ev-muted)" }}>
                  Add your photos from your invitation link.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

    </main>
  );
}

function LinkStatus({ link }: { link: Link }) {
  if (link === "retrying") {
    return (
      <p role="status" className="flex items-center gap-[0.8vmin] text-[1.8vmin] font-bold text-warning">
        <WifiOff className="size-[2vmin]" aria-hidden="true" />
        Reconnecting…
      </p>
    );
  }
  if (link === "gone") return null;
  return (
    <p className="flex items-center gap-[0.8vmin] text-[1.8vmin] font-bold tracking-widest uppercase" style={{ color: "var(--ev-muted)" }}>
      <span className="relative flex size-[1.2vmin]">
        <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ background: "var(--ev-accent)" }} />
        <span className="relative inline-flex size-full rounded-full" style={{ background: "var(--ev-accent)" }} />
      </span>
      Live
    </p>
  );
}

function Message({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-[2vmin] px-[6vmin] text-center">
      <span
        className="flex size-[11vmin] items-center justify-center rounded-full [&_svg]:size-[5vmin]"
        style={{ background: "color-mix(in srgb, var(--ev-accent) 14%, transparent)", color: "var(--ev-accent)" }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="text-[4.4vmin] leading-tight font-semibold" style={{ fontFamily: "var(--ev-heading)" }}>
        {title}
      </h2>
      <p className="max-w-[60vmin] text-[2.4vmin]" style={{ color: "var(--ev-muted)" }}>
        {body}
      </p>
    </div>
  );
}

/** The photo in the spotlight. The one before it stays underneath while the new one fades in. */
function Spotlight({ photo, onBroken }: { photo: WallPhoto; onBroken: () => void }) {
  const [stack, setStack] = useState<WallPhoto[]>([photo]);

  // A new photo goes on top of the stack (adjusting state while rendering, as React documents for derived state).
  if (stack[stack.length - 1]?.id !== photo.id) setStack([...stack.slice(-1), photo]);

  useEffect(() => {
    if (stack.length < 2) return;
    const timer = setTimeout(() => setStack((layers) => layers.slice(-1)), FADE_MS);
    return () => clearTimeout(timer);
  }, [stack]);

  return (
    <>
      {stack.map((layer) => (
        <SpotlightLayer key={layer.id} photo={layer} onBroken={onBroken} />
      ))}
    </>
  );
}

function SpotlightLayer({ photo, onBroken }: { photo: WallPhoto; onBroken: () => void }) {
  const [ready, setReady] = useState(false);
  const src = photoUrl(photo.path);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${ready ? "opacity-100" : "opacity-0"}`}
    >
      {/* the same photo, blurred, fills the space the sharp one leaves */}
      <StoragePhoto src={src} alt="" loading="eager" className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-3xl" />
      <StoragePhoto
        src={src}
        alt="A photo from the event"
        loading="eager"
        onLoad={() => setReady(true)}
        onError={onBroken}
        ref={(image) => {
          // A photo that was cached before this component could listen has no load event left.
          if (image?.complete && image.naturalWidth > 0) setReady(true);
        }}
        className="absolute inset-0 m-auto max-h-[94%] max-w-[94%] rounded-[2rem] object-contain shadow-2xl"
      />
    </div>
  );
}

/** Keeps the screen awake while the wall is open, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let closed = false;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock?.request("screen");
        if (closed) next?.release().catch(() => undefined);
        else lock = next ?? null;
      } catch {
        // A screen that cannot be held awake is a setting of the device, not a problem here.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

/** The full screen button shows when the mouse or a finger moves and goes away after a few seconds. */
function useScreenControls() {
  const [visible, setVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3500);
    };
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    timer = setTimeout(() => setVisible(false), 3500);
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  return { visible, fullscreen, toggleFullscreen };
}
