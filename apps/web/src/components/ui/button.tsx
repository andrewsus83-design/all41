import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

/** Design system v7 — pill buttons. Premium hover: lift + brighten + light sheen sweep; press scales down. */
type Phase = "neutral" | "primary" | "warm" | "go" | "green" | "violet" | "coral" | "red" | "amber" | "soft" | "ghost";
type Size = "sm" | "md" | "lg";

const phaseCls: Record<Phase, string> = {
  neutral: "grad-ink text-white shadow-soft hover:shadow-lift hover:brightness-110 sheen",
  primary: "grad-ink text-white shadow-soft hover:shadow-lift hover:brightness-110 sheen",
  warm: "grad-sunrise text-white shadow-soft hover:shadow-lift hover:brightness-105 sheen",
  go: "grad-fresh text-white shadow-soft hover:shadow-lift hover:brightness-105 sheen",
  green: "grad-fresh text-white shadow-soft hover:shadow-lift hover:brightness-105 sheen",
  violet: "grad-dusk text-white shadow-soft hover:shadow-lift hover:brightness-105 sheen",
  coral: "bg-coral-solid text-white hover:brightness-110 hover:shadow-lift sheen",
  amber: "bg-amber-soft text-amber hover:bg-amber-soft hover:brightness-[0.97] hover:shadow-soft",
  red: "bg-coral-soft text-coral hover:brightness-[0.97] hover:shadow-soft",
  soft: "bg-bg-elev-2 text-fg border border-line-strong hover:bg-sunken hover:border-line-strong hover:shadow-soft",
  ghost: "bg-bg-elev-2 text-fg border border-line-strong hover:bg-sunken hover:border-line-strong hover:shadow-soft",
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
        "inline-flex items-center justify-center gap-2 rounded-full font-title font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 select-none",
        phaseCls[phase],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  );
}
