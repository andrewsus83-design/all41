/** Faint "blueprint" graphic behind the hero — smaller rounded frames pushed to the far
 *  left and right edges (full width), each with a cinematic light tracing its outline. Decorative. */
const LINE = "var(--line-strong)";

function Node({ x, y, c = LINE }: { x: number; y: number; c?: string }) {
  return <circle cx={x} cy={y} r={3.5} fill="var(--bg)" stroke={c} strokeWidth={1.5} />;
}

/** A frame: faint base outline + a colored light that traces its perimeter. */
function Frame({ x, y, w, h, color, delay }: { x: number; y: number; w: number; h: number; color: string; delay: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={12} fill="none" stroke={LINE} strokeWidth={1.25} />
      {/* the running trace light */}
      <rect
        x={x} y={y} width={w} height={h} rx={12} pathLength={100}
        fill="none" stroke={color} strokeWidth={2.25} className="trace"
        style={{ animationDelay: `${delay}s`, filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <Node x={x} y={y} />
      <Node x={x + w} y={y} />
      <Node x={x} y={y + h} />
      <Node x={x + w} y={y + h} />
    </>
  );
}

const CORAL = "var(--coral-solid)";
const VIOLET = "var(--violet-solid)";
const AMBER = "var(--amber-solid)";
const GREEN = "var(--green-solid)";
const SKY = "var(--sky-solid)";

export function HeroBlueprint({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 720" fill="none" aria-hidden className={className} preserveAspectRatio="xMidYMid slice">
      {/* left edge cluster (full width) */}
      <Frame x={40} y={80} w={132} h={104} color={CORAL} delay={0} />
      <Frame x={110} y={250} w={116} h={96} color={VIOLET} delay={1.4} />
      <Frame x={20} y={430} w={124} h={100} color={GREEN} delay={2.6} />
      <path d="M172 132 H300" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <path d="M226 298 H320" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <Node x={300} y={132} c={CORAL} />
      <Node x={320} y={298} c={VIOLET} />

      {/* right edge cluster (mirrored, full width) */}
      <Frame x={1268} y={80} w={132} h={104} color={AMBER} delay={0.7} />
      <Frame x={1214} y={250} w={116} h={96} color={SKY} delay={2.0} />
      <Frame x={1296} y={430} w={124} h={100} color={CORAL} delay={3.2} />
      <path d="M1140 132 H1268" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <path d="M1120 298 H1214" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <Node x={1140} y={132} c={AMBER} />
      <Node x={1120} y={298} c={SKY} />
    </svg>
  );
}
