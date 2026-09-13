"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Cycles words on a white chip, each change popping in with a quick shine. */
export function RotatingWord({ words, interval = 1900, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="relative inline-flex items-center align-middle overflow-hidden rounded-3 bg-bg-elev border border-line shadow-soft px-2.5 md:px-4 -translate-y-[0.06em]">
      <span key={i} className={cn("rotating-word", className)}>{words[i]}</span>
      <span key={`flash-${i}`} className="rotating-flash" aria-hidden />
    </span>
  );
}
