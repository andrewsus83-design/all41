import type { ReactNode } from "react";

const tones = {
  neutral: "border-line-strong bg-zinc-800 text-zinc-300",
  gold: "border-gold/30 bg-gold/20 text-gold",
  cyan: "border-neon-cyan/30 bg-neon-cyan/15 text-neon-cyan",
  success: "border-success/30 bg-success/15 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  warning: "border-warning/30 bg-warning/10 text-warning",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide whitespace-nowrap uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
