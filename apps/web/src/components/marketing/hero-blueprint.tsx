import { cn } from "@/lib/cn";

/** Supernova-style blueprint: a sharp-cornered bento grid pinned flush to each screen edge.
 *  The tracing light runs AROUND THE OUTLINE OF THE EXISTING BOXES — no separate wire.
 *  Each traced box is drawn as a <path> (rect perimeter) so pathLength works in Safari,
 *  and preserveAspectRatio="xMinYMid slice" keeps the boxes crisp and flush to the edge. */
const LINE = "var(--line-strong)";
const VIOLET = "var(--violet-solid)";
const CORAL = "var(--coral-solid)";
const AMBER = "var(--amber-solid)";

type Rect = [number, number, number, number]; // x, y, w, h

// the bento grid, tiled from the true edge (x=0) inward — sharp corners, shared edges
const CELLS: Rect[] = [
  [0, 120, 160, 160],
  [160, 120, 130, 110],
  [0, 280, 110, 200],
  [110, 280, 180, 100],
  [110, 380, 180, 130],
  [0, 480, 160, 170],
  [160, 510, 130, 140],
  [0, 650, 290, 170],
  [290, 120, 130, 700],
];

// which of THOSE exact boxes get a light running around their own border
const TRACED: Array<{ r: Rect; color: string; delay: number }> = [
  { r: [0, 120, 160, 160], color: VIOLET, delay: 0 },
  { r: [110, 380, 180, 130], color: AMBER, delay: 1.6 },
  { r: [160, 510, 130, 140], color: CORAL, delay: 3.1 },
];

// the perimeter of a rectangle as a closed path (sharp corners)
function rectPath([x, y, w, h]: Rect) {
  return `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
}

function TracedBox({ r, color, delay }: { r: Rect; color: string; delay: number }) {
  const d = rectPath(r);
  return (
    <>
      {/* the box itself, tinted so it reads as "active" */}
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="miter" opacity={0.45} />
      {/* a bright light travelling around the SAME outline */}
      <path
        d={d}
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        className="trace"
        style={{ animationDelay: `-${delay}s`, filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </>
  );
}

function EdgeCluster({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <div
      className={cn(
        "absolute top-0 h-full w-[42%] max-w-[560px] pointer-events-none",
        left ? "left-0" : "right-0 -scale-x-100",
      )}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, #000 46%, transparent 94%), linear-gradient(to bottom, transparent, #000 15%, #000 84%, transparent)",
        maskImage:
          "linear-gradient(to right, #000 46%, transparent 94%), linear-gradient(to bottom, transparent, #000 15%, #000 84%, transparent)",
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    >
      <svg viewBox="0 0 420 900" fill="none" preserveAspectRatio="xMinYMid slice" className="w-full h-full" aria-hidden>
        {/* the full grid, faint */}
        {CELLS.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="none" stroke={LINE} strokeWidth={1.25} />
        ))}
        {/* light running around a few of those same boxes */}
        {TRACED.map((t, i) => (
          <TracedBox key={i} r={t.r} color={t.color} delay={left ? t.delay : t.delay + 2} />
        ))}
      </svg>
    </div>
  );
}

export function HeroBlueprint() {
  return (
    <>
      <EdgeCluster side="left" />
      <EdgeCluster side="right" />
    </>
  );
}
