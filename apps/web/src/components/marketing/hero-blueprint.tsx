import { cn } from "@/lib/cn";

/** Supernova-style blueprint: sharp-cornered bento grid pinned to each screen edge,
 *  fading naturally toward the empty centre, with a clean wire tracing the grid lines.
 *  SVG uses preserveAspectRatio="none" so it fills the edge column exactly — no empty gap,
 *  and only orthogonal shapes are drawn so the non-uniform scale stays crisp (90° corners hold). */
const LINE = "var(--line-strong)";
const VIOLET = "var(--violet-solid)";
const CORAL = "var(--coral-solid)";

// bento cells tiled from the true edge (x=0) inward — sharp corners, shared edges
const CELLS: Array<[number, number, number, number]> = [
  [0, 80, 150, 150],
  [150, 80, 150, 110],
  [0, 230, 110, 180],
  [110, 230, 190, 90],
  [110, 320, 190, 120],
  [0, 410, 150, 160],
  [150, 440, 150, 150],
  [0, 570, 300, 160],
  [300, 80, 100, 650],
];

// bright orthogonal wires that run along the grid lines (sharp 90° turns)
const WIRE_VIOLET = "M0 80 H150 V440 H300 V730";
const WIRE_CORAL = "M0 410 H110 V570 H300";

function Wire({ d, color, delay, base }: { d: string; color: string; delay: number; base: number }) {
  return (
    <>
      {/* the full wire, drawn as a solid line (like supernova's blue trace) */}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="miter" opacity={base} />
      {/* a bright current gliding along the same wire */}
      <path
        d={d}
        pathLength={100}
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        className="trace"
        style={{ animationDelay: `-${delay}s`, filter: `drop-shadow(0 0 5px ${color})` }}
      />
    </>
  );
}

function EdgeCluster({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <div
      className={cn(
        "absolute top-0 h-full w-[44%] max-w-[560px] pointer-events-none",
        left ? "left-0" : "right-0 -scale-x-100",
      )}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, #000 40%, transparent 92%), linear-gradient(to bottom, transparent, #000 14%, #000 82%, transparent)",
        maskImage:
          "linear-gradient(to right, #000 40%, transparent 92%), linear-gradient(to bottom, transparent, #000 14%, #000 82%, transparent)",
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
      }}
    >
      <svg viewBox="0 0 400 800" fill="none" preserveAspectRatio="none" className="w-full h-full" aria-hidden>
        {CELLS.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="none" stroke={LINE} strokeWidth={1.25} />
        ))}
        <Wire d={WIRE_VIOLET} color={VIOLET} delay={left ? 0 : 2} base={0.5} />
        <Wire d={WIRE_CORAL} color={CORAL} delay={left ? 1.3 : 3.1} base={0.28} />
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
