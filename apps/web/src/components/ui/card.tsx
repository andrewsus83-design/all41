import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/** v7 — cards: white surface, soft warm shadow, generous radius. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-bg-elev border border-line rounded-5 p-6 shadow-soft", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-title text-lg font-bold", className)} {...props} />;
}

export function CardHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-fg-muted", className)} {...props} />;
}
