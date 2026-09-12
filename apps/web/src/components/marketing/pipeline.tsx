import { cn } from "@/lib/cn";
import type { PipelineChip } from "@/app/(marketing)/_lib/data";

const tone: Record<PipelineChip["kind"], string> = {
  search: "border-amber/40 text-amber",
  crawl: "border-amber/40 text-amber",
  llm: "border-green/40 text-green",
  deliver: "border-line-strong text-fg-muted",
};

export function Pipeline({ chips, className }: { chips: PipelineChip[]; className?: string }) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)} aria-label="How we connect it">
      {chips.map((c, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className={cn("squircle inline-flex items-baseline gap-2 rounded-2 border bg-bg px-3 py-2 text-sm", tone[c.kind])}>
            <span className="font-title font-medium">{c.title}</span>
            <span className="text-fg-muted">·</span>
            <span className="text-fg-muted font-mono text-xs">{c.detail}</span>
          </span>
          {i < chips.length - 1 ? <span className="text-fg-faint" aria-hidden>→</span> : null}
        </li>
      ))}
    </ol>
  );
}
