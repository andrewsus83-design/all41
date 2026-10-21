import type { ReactNode } from "react";

const tones = {
  neutral: "border-line text-muted",
  cyan: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  pink: "border-neon-pink/40 bg-neon-pink/10 text-neon-pink",
  lime: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  violet: "border-neon-violet/40 bg-neon-violet/10 text-neon-violet",
  gold: "border-gold/40 bg-gold/10 text-gold",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
