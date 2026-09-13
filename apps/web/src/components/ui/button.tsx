import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

/** Design system v7 — pill buttons. One primary action per screen; gradients garnish, never dominate. */
type Phase = "neutral" | "primary" | "warm" | "go" | "green" | "violet" | "coral" | "red" | "amber" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

const phaseCls: Record<Phase, string> = {
  // primary = ink gradient (the default main action)
  neutral: "grad-ink text-white shadow-soft hover:shadow-lift",
  primary: "grad-ink text-white shadow-soft hover:shadow-lift",
  // warm = sunrise gradient (hero / top CTA)
  warm: "grad-sunrise text-white shadow-soft hover:shadow-lift",
  // go = fresh gradient (run / success)
  go: "grad-fresh text-white shadow-soft hover:shadow-lift",
  green: "grad-fresh text-white shadow-soft hover:shadow-lift",
  // violet = dusk gradient (premium / AI)
  violet: "grad-dusk text-white shadow-soft hover:shadow-lift",
  // coral = solid accent
  coral: "bg-coral-solid text-white hover:brightness-105",
  // subtle / tertiary
  amber: "bg-amber-soft text-amber hover:brightness-[0.98]",
  red: "bg-coral-soft text-coral hover:brightness-[0.98]",
  // secondary
  soft: "bg-bg-elev-2 text-fg border border-line-strong hover:bg-sunken",
  ghost: "bg-bg-elev-2 text-fg border border-line-strong hover:bg-sunken",
};
const sizeCls: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export function Button({
  phase = "neutral",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { phase?: Phase; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-title font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed select-none",
        phaseCls[phase],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  );
}
