import { cn } from "@/lib/cn";

/** Blueprint frames pinned to the far LEFT and RIGHT edges (so the centre stays open),
 *  each with a light tracing its outline. Uses <path> + pathLength so the trace works in Safari. */
const LINE = "var(--line-strong)";
const CORAL = "var(--coral-solid)";
const VIOLET = "var(--violet-solid)";
const AMBER = "var(--amber-solid)";
const GREEN = "var(--green-solid)";
const SKY = "var(--sky-solid)";

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`;
}

function Node({ x, y, c = LINE }: { x: number; y: number; c?: string }) {
  return <circle cx={x} cy={y} r={3.5} fill="var(--bg)" stroke={c} strokeWidth={1.5} />;
}

function Frame({ x, y, w, h, color, delay }: { x: number; y: number; w: number; h: number; color: string; delay: number }) {
  const d = roundedRect(x, y, w, h, 12);
  return (
    <>
      {/* faint base outline */}
      <path d={d} fill="none" stroke={LINE} strokeWidth={1.5} />
      {/* a bright light streak that traces the SAME outline (path + pathLength → Safari-safe) */}
      <path
        d={d} pathLength={100} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" className="trace"
        style={{ animationDelay: `-${delay}s`, filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <Node x={x} y={y} />
      <Node x={x + w} y={y} />
      <Node x={x} y={y + h} />
      <Node x={x + w} y={y + h} />
    </>
  );
}

/** One edge column of frames, always sitting against the viewport edge. Right side is mirrored. */
function EdgeCluster({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  const d = left ? 0 : 0.9; // stagger the two sides
  return (
    <div className={cn("absolute top-0 h-full w-[210px] lg:w-[280px] pointer-events-none", left ? "left-0" : "right-0 -scale-x-100")}>
      <svg viewBox="0 0 280 720" fill="none" preserveAspectRatio="xMidYMid meet" className="w-full h-full" aria-hidden>
        <Frame x={30} y={90} w={150} h={116} color={CORAL} delay={d + 0} />
        <Frame x={95} y={280} w={128} h={104} color={VIOLET} delay={d + 1.4} />
        <Frame x={10} y={470} w={140} h={110} color={GREEN} delay={d + 2.6} />
        <path d="M180 148 H272" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
        <path d="M223 332 H274" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
        <Node x={272} y={148} c={AMBER} />
        <Node x={274} y={332} c={SKY} />
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
