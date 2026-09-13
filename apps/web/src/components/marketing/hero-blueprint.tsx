import { cn } from "@/lib/cn";

/** Supernova-style blueprint: a sharp-cornered bento grid pinned flush to each screen edge,
 *  fading naturally toward the empty centre. Just the boxes — no moving dashes, no trace. */
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

// a few of those same boxes get a static accent colour (no animation)
const ACCENT: Array<{ r: Rect; color: string }> = [
  { r: [0, 120, 160, 160], color: VIOLET },
  { r: [110, 380, 180, 130], color: AMBER },
  { r: [160, 510, 130, 140], color: CORAL },
];

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
        {CELLS.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="none" stroke={LINE} strokeWidth={1.25} />
        ))}
        {ACCENT.map(({ r: [x, y, w, h], color }, i) => (
          <rect key={`a${i}`} x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={1.75} opacity={0.5} />
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
