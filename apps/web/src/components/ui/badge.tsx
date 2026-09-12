import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "red" | "amber" | "green";
const toneCls: Record<Tone, string> = {
  neutral: "bg-bg-elev-2 text-fg-muted border-line",
  red: "bg-red-soft text-red border-transparent",
  amber: "bg-amber-soft text-amber border-transparent",
  green: "bg-green-soft text-green border-transparent",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-1 border text-xs font-medium tracking-wide uppercase",
        toneCls[tone],
        className,
      )}
      {...props}
    />
  );
}
