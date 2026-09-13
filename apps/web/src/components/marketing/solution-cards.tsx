import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Jasper-style illustrated category cards, in the all41 palette:
 *  a tinted panel + faint graph grid + a bold ink-outlined line-art glyph, title, line, arrow. */

const INK = "var(--fg)";

type Tone = "green" | "coral" | "violet";
const toneBg: Record<Tone, string> = {
  green: "bg-green-soft",
  coral: "bg-coral-soft",
  violet: "bg-violet-soft",
};
const solid: Record<Tone, string> = {
  green: "var(--green-solid)",
  coral: "var(--coral-solid)",
  violet: "var(--violet-solid)",
};

const GRID = {
  backgroundImage:
    "linear-gradient(rgba(30,28,26,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30,28,26,0.05) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
} as const;

function Star({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  const d = `M${x} ${y - s} C ${x} ${y - s * 0.28}, ${x + s * 0.28} ${y}, ${x + s} ${y} C ${x + s * 0.28} ${y}, ${x} ${y + s * 0.28}, ${x} ${y + s} C ${x} ${y + s * 0.28}, ${x - s * 0.28} ${y}, ${x - s} ${y} C ${x - s * 0.28} ${y}, ${x} ${y - s * 0.28}, ${x} ${y - s} Z`;
  return <path d={d} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
}

function GlyphFound() {
  const g = solid.green;
  return (
    <svg viewBox="0 0 240 170" className="w-full h-auto max-h-44" fill="none" aria-hidden>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="80" y="24" width="84" height="110" rx="12" fill={g} fillOpacity={0.3} stroke={INK} strokeWidth={5} />
        <rect x="52" y="42" width="84" height="106" rx="12" fill="var(--bg-elev)" stroke={INK} strokeWidth={5} />
        <circle cx="74" cy="68" r="9" fill={g} stroke={INK} strokeWidth={4} />
        <line x1="90" y1="63" x2="122" y2="63" stroke={INK} strokeWidth={5} />
        <line x1="90" y1="74" x2="116" y2="74" stroke={INK} strokeWidth={5} />
        <line x1="66" y1="98" x2="122" y2="98" stroke={INK} strokeWidth={5} />
        <line x1="66" y1="110" x2="122" y2="110" stroke={INK} strokeWidth={5} />
        <line x1="66" y1="122" x2="104" y2="122" stroke={INK} strokeWidth={5} />
        <path d="M150 96 L186 110 L170 117 L180 138 L169 142 L159 121 L145 132 Z" fill={g} stroke={INK} strokeWidth={4.5} />
        <Star x={172} y={46} s={13} fill={g} />
      </g>
    </svg>
  );
}

function GlyphWin() {
  const c = solid.coral;
  return (
    <svg viewBox="0 0 240 170" className="w-full h-auto max-h-44" fill="none" aria-hidden>
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* connectors */}
        <path d="M120 58 H150" stroke={INK} strokeWidth={5} />
        <path d="M168 74 V120 H186" stroke={INK} strokeWidth={5} />
        {/* box 1 */}
        <rect x="24" y="32" width="96" height="52" rx="12" fill="var(--bg-elev)" stroke={INK} strokeWidth={5} />
        <circle cx="42" cy="50" r="6" fill={c} stroke={INK} strokeWidth={3.5} />
        <line x1="56" y1="50" x2="104" y2="50" stroke={INK} strokeWidth={4.5} />
        <line x1="42" y1="68" x2="104" y2="68" stroke={INK} strokeWidth={4.5} />
        {/* node */}
        <circle cx="168" cy="58" r="17" fill={c} stroke={INK} strokeWidth={5} />
        {/* box 2 */}
        <rect x="120" y="118" width="96" height="52" rx="12" fill={c} fillOpacity={0.28} stroke={INK} strokeWidth={5} />
        <circle cx="138" cy="136" r="6" fill="var(--bg-elev)" stroke={INK} strokeWidth={3.5} />
        <line x1="152" y1="136" x2="200" y2="136" stroke={INK} strokeWidth={4.5} />
        <line x1="138" y1="154" x2="200" y2="154" stroke={INK} strokeWidth={4.5} />
        {/* triangle accent */}
        <path d="M64 108 L92 156 L36 156 Z" fill={c} stroke={INK} strokeWidth={5} />
      </g>
    </svg>
  );
}

function GlyphKnow() {
  const v = solid.violet;
  return (
    <svg viewBox="0 0 240 170" className="w-full h-auto max-h-44" fill="none" aria-hidden>
      <g strokeLinecap="round" strokeLinejoin="round">
        <g stroke={INK} strokeWidth={5} fill="none">
          <ellipse cx="120" cy="85" rx="74" ry="30" />
          <ellipse cx="120" cy="85" rx="74" ry="30" transform="rotate(60 120 85)" />
          <ellipse cx="120" cy="85" rx="74" ry="30" transform="rotate(120 120 85)" />
        </g>
        <circle cx="120" cy="85" r="16" fill={v} stroke={INK} strokeWidth={5} />
        <circle cx="120" cy="85" r="5" fill="var(--bg-elev)" />
        <path d="M188 52 L206 52 L197 68 Z" fill={v} stroke={INK} strokeWidth={4} />
        <rect x="34" y="104" width="20" height="20" rx="4" transform="rotate(-18 44 114)" fill={v} stroke={INK} strokeWidth={4} />
        <Star x={44} y={44} s={11} fill={v} />
        <circle cx="196" cy="118" r="6" fill={v} stroke={INK} strokeWidth={3.5} />
      </g>
    </svg>
  );
}

function SolutionCard({ href, tone, title, desc, children }: { href: string; tone: Tone; title: string; desc: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn("group relative block overflow-hidden rounded-5 border border-line lift h-full", toneBg[tone])}>
      <div className="absolute inset-0 opacity-70" style={GRID} aria-hidden />
      <div className="relative flex flex-col gap-4 p-7 h-full">
        <h3 className="font-title text-2xl md:text-[1.75rem] font-semibold tracking-tight text-fg">{title}</h3>
        <div className="flex-1 flex items-center justify-center py-3">{children}</div>
        <div className="flex items-end justify-between gap-4">
          <p className="text-fg-muted leading-relaxed max-w-[15rem]">{desc}</p>
          <span className="shrink-0 text-fg text-2xl transition-transform group-hover:translate-x-1" aria-hidden>→</span>
        </div>
      </div>
    </Link>
  );
}

export function SolutionCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <SolutionCard href="/apps" tone="green" title="Get found" desc="Show up on Google and in AI answers.">
        <GlyphFound />
      </SolutionCard>
      <SolutionCard href="/apps" tone="coral" title="Win the work" desc="Proposals and bids that actually land.">
        <GlyphWin />
      </SolutionCard>
      <SolutionCard href="/apps" tone="violet" title="Know more, fast" desc="One sharp, sourced answer — not ten tabs.">
        <GlyphKnow />
      </SolutionCard>
    </div>
  );
}
