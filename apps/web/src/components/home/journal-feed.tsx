import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/** One thing that happened in your world — a run that produced a result, or an app you launched. */
export type JournalEntry = {
  id: string;
  kind: "result" | "app";
  icon: string;
  source: string;
  title: string;
  at: string; // ISO
  href: string;
  live?: boolean;
};

export type JournalStats = { results: number; apps: number; nodes: number; files: number };
export type LivingApp = { id: string; icon: string; name: string; live: boolean };

function rel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** The left 2/3 of Home: a journal that stacks newest-on-top, anchored by the welcome at the very bottom. */
export function JournalFeed({ entries, name, stats, livingApps, welcome }: { entries: JournalEntry[]; name: string; stats: JournalStats; livingApps: LivingApp[]; welcome: string }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* pinned top — a glance at what's alive, so it never scrolls out of reach */}
      <header className="shrink-0 space-y-3 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Your journal</h2>
          <Link href="/data" className="text-sm text-fg-faint hover:text-fg transition">Add a note →</Link>
        </div>
        {livingApps.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            {livingApps.map((a) => (
              <Link key={a.id} href={`/my-apps?id=${a.id}`} className="squircle shrink-0 inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elev pl-2.5 pr-3 py-1.5 text-sm hover:border-line-strong hover:bg-bg-elev-2 transition">
                <span className="text-base leading-none">{a.icon}</span>
                <span className="truncate max-w-40">{a.name}</span>
                {a.live && <span className="size-1.5 rounded-full bg-green" aria-label="Live" />}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* the feed — internally scrolls; newest first, welcome anchored at the bottom */}
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-1">
        <div className="relative before:absolute before:left-[15px] before:top-3 before:bottom-6 before:w-px before:bg-line">
          {entries.map((e) => (
            <article key={e.id} className="relative pl-11 pb-5">
              <span className="absolute left-0 top-1 grid place-items-center size-8 rounded-full bg-bg-elev border border-line text-base leading-none">{e.icon}</span>
              <Link href={e.href} className="squircle block rounded-4 border border-line bg-bg-elev p-4 space-y-1.5 hover:border-line-strong hover:bg-bg-elev-2 transition">
                <div className="flex items-center gap-2 text-xs text-fg-faint">
                  <span className="num truncate">{e.source}</span>
                  {e.kind === "app" && (e.live ? <Badge tone="green">Live</Badge> : <Badge>Ready</Badge>)}
                  <span className="ml-auto num shrink-0">{rel(e.at)}</span>
                </div>
                <p className="text-sm leading-snug line-clamp-3">{e.title}</p>
              </Link>
            </article>
          ))}

          {/* origin — the welcome, now the first page of the journal */}
          <article className="relative pl-11">
            <span className="absolute left-0 top-1 grid place-items-center size-8 rounded-full bg-amber-soft border border-amber/30 text-base leading-none">👋</span>
            <div className="squircle rounded-5 border border-line bg-bg-elev p-6 space-y-3">
              <h3 className="text-2xl font-title font-semibold tracking-tight">Hello, {name}</h3>
              <p className="text-fg-muted leading-relaxed text-pretty">{welcome}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted num pt-1">
                <span><span className="text-fg font-semibold">{stats.results}</span> results</span>
                <span><span className="text-fg font-semibold">{stats.apps}</span> living apps</span>
                <span><span className="text-fg font-semibold">{stats.nodes}</span> memory nodes</span>
                <span><span className="text-fg font-semibold">{stats.files}</span> files</span>
              </div>
              <p className="reflect text-fg-muted text-lg pt-1">This is your journal — every result stacks up here ✿</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
