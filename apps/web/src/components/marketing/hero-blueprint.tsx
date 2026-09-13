/** Faint "blueprint" graphic behind the hero — rounded frames + connector nodes,
 *  symmetric around the centered text, so the canvas isn't monotonous. Decorative. */
const LINE = "var(--line-strong)";

function Node({ x, y, c = LINE }: { x: number; y: number; c?: string }) {
  return <circle cx={x} cy={y} r={4} fill="var(--bg)" stroke={c} strokeWidth={1.5} />;
}

function Frame({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={LINE} strokeWidth={1.25} />
      <Node x={x} y={y} />
      <Node x={x + w} y={y} />
      <Node x={x} y={y + h} />
      <Node x={x + w} y={y + h} />
    </>
  );
}

export function HeroBlueprint({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 760" fill="none" aria-hidden className={className} preserveAspectRatio="xMidYMid slice">
      {/* left cluster */}
      <Frame x={150} y={120} w={190} h={150} />
      <Frame x={250} y={330} w={160} h={130} />
      <Frame x={60} y={430} w={150} h={120} />
      <path d="M340 195 H520" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <path d="M330 395 H500" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <Node x={520} y={195} c="var(--coral-solid)" />
      <Node x={500} y={395} c="var(--violet-solid)" />

      {/* right cluster (mirrored) */}
      <Frame x={1100} y={120} w={190} h={150} />
      <Frame x={1030} y={330} w={160} h={130} />
      <Frame x={1230} y={430} w={150} h={120} />
      <path d="M920 195 H1100" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <path d="M940 395 H1030" stroke={LINE} strokeWidth={1.25} strokeDasharray="5 7" />
      <Node x={920} y={195} c="var(--amber-solid)" />
      <Node x={940} y={395} c="var(--green-solid)" />
    </svg>
  );
}
