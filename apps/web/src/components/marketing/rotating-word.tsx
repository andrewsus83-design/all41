"use client";
import { useEffect, useState } from "react";

/** Cycles through words with a small fade-up on each change. */
export function RotatingWord({ words, interval = 1900 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="inline-flex align-baseline" aria-live="polite">
      <span key={i} className="rotating-word">{words[i]}</span>
    </span>
  );
}
