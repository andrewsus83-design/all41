import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Phase = "neutral" | "red" | "amber" | "green" | "ghost";
type Size = "sm" | "md" | "lg";

const phaseCls: Record<Phase, string> = {
  neutral: "bg-fg text-bg hover:opacity-90",
  red: "bg-red text-white hover:brightness-110",
  amber: "bg-amber text-black hover:brightness-110",
  green: "bg-green text-black hover:brightness-110",
  ghost: "bg-transparent text-fg border border-line-strong hover:bg-bg-elev-2",
};
const sizeCls: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-1",
  md: "h-12 px-6 text-base rounded-2",
  lg: "h-14 px-8 text-lg rounded-3",
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
        "squircle inline-flex items-center justify-center gap-2 font-title font-medium transition disabled:opacity-40 disabled:cursor-not-allowed select-none",
        phaseCls[phase],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  );
}
