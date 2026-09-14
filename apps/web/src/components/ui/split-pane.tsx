"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A resizable two-panel split with a draggable divider. Ratio persists (localStorage). Stacks on mobile. */
export function SplitPane({
  left,
  right,
  storageKey,
  defaultPct = 42,
  min = 24,
  max = 74,
  fill = false,
}: {
  left: ReactNode;
  right: ReactNode;
  storageKey: string;
  defaultPct?: number;
  min?: number;
  max?: number;
  /** Fill the viewport height (desktop) so each panel scrolls internally — for chat-style panes. */
  fill?: boolean;
}) {
  const [pct, setPct] = useState(defaultPct);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pctRef = useRef(defaultPct);
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s) { const v = clamp(Number(s)); pctRef.current = v; setPct(v); }
    } catch { /* private mode */ }
  }, [storageKey, clamp]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const v = clamp(((e.clientX - rect.left) / rect.width) * 100);
      pctRef.current = v;
      setPct(v);
    };
    const onUp = () => {
      setDragging(false);
      try { localStorage.setItem(storageKey, String(Math.round(pctRef.current))); } catch { /* private mode */ }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, clamp, storageKey]);

  return (
    <>
      {/* mobile: stacked (chat first, then apps) */}
      <div className="lg:hidden space-y-6">
        {right}
        {left}
      </div>

      {/* desktop: resizable split */}
      <div ref={ref} className={cn("hidden lg:flex items-stretch", fill && "h-[calc(100vh-10rem)]", dragging && "cursor-col-resize select-none")}>
        <div style={{ width: `${pct}%` }} className={cn("min-w-0 pr-3", fill && "h-full min-h-0")}>{left}</div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          tabIndex={0}
          onPointerDown={(e) => { e.preventDefault(); setDragging(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { const v = clamp(pct - 3); pctRef.current = v; setPct(v); try { localStorage.setItem(storageKey, String(Math.round(v))); } catch {} }
            if (e.key === "ArrowRight") { const v = clamp(pct + 3); pctRef.current = v; setPct(v); try { localStorage.setItem(storageKey, String(Math.round(v))); } catch {} }
          }}
          style={{ touchAction: "none" }}
          className="group relative w-3 shrink-0 cursor-col-resize flex items-center justify-center outline-none"
        >
          <span className={cn("h-14 w-1 rounded-full transition", dragging ? "bg-coral" : "bg-line-strong group-hover:bg-coral group-focus:bg-coral")} />
        </div>

        <div style={{ width: `${100 - pct}%` }} className={cn("min-w-0 pl-3", fill && "h-full min-h-0")}>{right}</div>
      </div>
    </>
  );
}
