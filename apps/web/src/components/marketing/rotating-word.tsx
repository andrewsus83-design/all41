"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Cycles through words with a small fade-up on each change.
 *  Carries its own text style (className) so a gradient clips correctly even as an inline-block. */
export function RotatingWord({ words, interval = 1900, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span key={i} className={cn("rotating-word inline-block", className)} aria-live="polite">
      {words[i]}
    </span>
  );
}
