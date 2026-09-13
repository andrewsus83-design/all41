import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/** v7 — pill badges: soft background + deep text per signal. */
type Tone = "neutral" | "coral" | "red" | "amber" | "green" | "violet" | "sky";
const toneCls: Record<Tone, string> = {
  neutral: "bg-bg-elev-2 text-fg-muted border border-line",
  coral: "bg-coral-soft text-coral",
  red: "bg-coral-soft text-coral",
  amber: "bg-amber-soft text-amber",
  green: "bg-green-soft text-green",
  violet: "bg-violet-soft text-violet",
  sky: "bg-sky-soft text-sky",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold tracking-wide uppercase",
        toneCls[tone],
        className,
      )}
      {...props}
    />
  );
}
