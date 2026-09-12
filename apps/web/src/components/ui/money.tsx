import { cn } from "@/lib/cn";

/** Plain-currency display (never opaque points). Always JetBrains Mono. */
export function Money({ usd, className, precision }: { usd: number | string; className?: string; precision?: number }) {
  const n = typeof usd === "string" ? Number(usd) : usd;
  const p = precision ?? (Math.abs(n) < 0.01 && n !== 0 ? 4 : 2);
  return <span className={cn("num", className)}>${n.toFixed(p)}</span>;
}
