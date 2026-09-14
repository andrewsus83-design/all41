"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renameSpace, addTodo, setTodoDone, deleteTodo, addNote, type Todo, type TodoKind, type Cadence } from "@/app/(app)/home/journal-actions";

export type JournalEntry = { id: string; kind: "result" | "note"; icon: string; source: string; title: string; detail: string; at: string; href?: string };
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

/** The left 2/3 of Home — the journal: a renameable space, todos, a compose card, and a feed that stacks
 * newest-on-top, anchored by the welcome at the very bottom. Cards open a full-screen detail. */
export function JournalPanel({ name, spaceName, stats, livingApps, welcome, entries: initialEntries, todos: initialTodos }: {
  name: string; spaceName: string | null; stats: JournalStats; livingApps: LivingApp[]; welcome: string;
  entries: JournalEntry[]; todos: Todo[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [todos, setTodos] = useState(initialTodos);
  const [active, setActive] = useState<JournalEntry | null>(null);

  const onNote = (e: JournalEntry) => setEntries((p) => [e, ...p]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 space-y-3 pb-4 border-b border-line">
        <SpaceName initial={spaceName} />
        <TodoStrip todos={todos} setTodos={setTodos} />
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

      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-1 pt-4">
        <Compose onNote={onNote} />
        <div className="relative before:absolute before:left-[15px] before:top-3 before:bottom-6 before:w-px before:bg-line">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onOpen={() => setActive(e)} />
          ))}
          <WelcomeOrigin name={name} stats={stats} welcome={welcome} />
        </div>
      </div>

      {active && <DetailModal entry={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function SpaceName({ initial }: { initial: string | null }) {
  const [name, setName] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  const save = () => {
    setEditing(false);
    start(async () => { await renameSpace(name); });
  };

  if (editing) {
    return (
      <input
        ref={ref}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setName(initial ?? ""); setEditing(false); } }}
        placeholder="Name your space"
        maxLength={40}
        aria-label="Space name"
        className="text-lg font-medium bg-transparent outline-none border-b-2 border-amber/60 w-full max-w-xs"
      />
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="group inline-flex items-center gap-2 text-left" title="Rename your space">
      <h2 className="text-lg font-medium">{name.trim() || "Your journal"}</h2>
      <PencilIcon className={cn("size-4 text-fg-faint transition", pending ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-100")} />
    </button>
  );
}

function TodoStrip({ todos, setTodos }: { todos: Todo[]; setTodos: React.Dispatch<React.SetStateAction<Todo[]>> }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TodoKind>("once");
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const [, start] = useTransition();

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    const kd = kind, cd = kind === "routine" ? cadence : null;
    setTitle(""); setAdding(false);
    start(async () => {
      const r = await addTodo(t, kd, cd);
      if (r.ok) setTodos((p) => [...p, r.todo]);
    });
  };
  const toggle = (id: string, done: boolean) => {
    setTodos((p) => p.map((x) => (x.id === id ? { ...x, done } : x)));
    start(async () => { await setTodoDone(id, done); });
  };
  const remove = (id: string) => {
    setTodos((p) => p.filter((x) => x.id !== id));
    start(async () => { await deleteTodo(id); });
  };

  return (
    <div className="space-y-2">
      {todos.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {todos.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 text-sm">
              <button type="button" role="checkbox" aria-checked={t.done} onClick={() => toggle(t.id, !t.done)} className={cn("size-4 rounded-[5px] border grid place-items-center shrink-0 transition", t.done ? "bg-green border-green text-white" : "border-line-strong hover:border-green")}>
                {t.done && <CheckIcon className="size-3" />}
              </button>
              <span className={cn("min-w-0 truncate", t.done && "line-through text-fg-faint")}>{t.title}</span>
              {t.kind === "routine" && <Badge tone="amber">{t.cadence ?? "routine"}</Badge>}
              <button type="button" onClick={() => remove(t.id)} aria-label="Delete" className="ml-auto shrink-0 text-fg-faint hover:text-red opacity-0 group-hover:opacity-100 transition">✕</button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="squircle rounded-3 border border-line bg-bg-elev p-3 space-y-2.5">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }} placeholder="What needs doing?" className="w-full bg-transparent outline-none text-sm" aria-label="Todo" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-full border border-line-strong p-0.5 text-xs font-title font-medium">
              {(["once", "routine"] as TodoKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={cn("px-2.5 py-1 rounded-full transition", kind === k ? "bg-fg text-bg" : "text-fg-muted hover:text-fg")}>{k === "once" ? "One-time" : "Routine"}</button>
              ))}
            </div>
            {kind === "routine" && (
              <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)} aria-label="How often" className="squircle rounded-full border border-line-strong bg-bg-elev text-xs font-title font-medium px-2.5 py-1.5 outline-none">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={() => setAdding(false)} className="text-xs text-fg-faint hover:text-fg px-2">Cancel</button>
              <Button size="sm" phase="green" disabled={!title.trim()} onClick={submit}>Add</Button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition">
          <span className="grid place-items-center size-5 rounded-full border border-line-strong text-fg-faint">＋</span>
          Todo
        </button>
      )}
    </div>
  );
}

function Compose({ onNote }: { onNote: (e: JournalEntry) => void }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [syncing, setSyncing] = useState(false);

  const post = () => {
    const b = body.trim();
    if (!b) return;
    setBody("");
    start(async () => {
      const r = await addNote(b);
      if (r.ok) onNote({ id: r.note.id, kind: "note", icon: "✍️", source: "Note", title: r.note.body, detail: r.note.body, at: r.note.created_at });
    });
  };
  const sync = () => { setSyncing(true); router.refresh(); setTimeout(() => setSyncing(false), 800); };

  return (
    <div className="squircle rounded-4 border border-line bg-bg-elev p-4 mb-5 ml-11 -mt-0.5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(); }}
        rows={body ? 3 : 1}
        placeholder="Write now…"
        aria-label="Write a note"
        className="w-full bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-fg-faint"
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <button type="button" onClick={sync} className="inline-flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg transition" title="Pull in the latest">
          <RefreshIcon className={cn("size-3.5", syncing && "animate-spin")} /> Sync
        </button>
        <Button size="sm" phase="green" disabled={!body.trim() || pending} onClick={post}>{pending ? "Saving…" : "Post"}</Button>
      </div>
    </div>
  );
}

function EntryCard({ entry, onOpen }: { entry: JournalEntry; onOpen: () => void }) {
  return (
    <article className="relative pl-11 pb-5">
      <span className="absolute left-0 top-1 grid place-items-center size-8 rounded-full bg-bg-elev border border-line text-base leading-none">{entry.icon}</span>
      <button type="button" onClick={onOpen} className="squircle block w-full text-left rounded-4 border border-line bg-bg-elev p-4 space-y-1.5 hover:border-line-strong hover:bg-bg-elev-2 transition">
        <div className="flex items-center gap-2 text-xs text-fg-faint">
          <span className="num truncate">{entry.source}</span>
          {entry.kind === "note" && <Badge tone="amber">Note</Badge>}
          <span className="ml-auto num shrink-0">{rel(entry.at)}</span>
        </div>
        <p className="text-sm leading-snug line-clamp-3">{entry.title}</p>
      </button>
    </article>
  );
}

function WelcomeOrigin({ name, stats, welcome }: { name: string; stats: JournalStats; welcome: string }) {
  return (
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
  );
}

function DetailModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[88] bg-bg flex flex-col scene-in" role="dialog" aria-modal="true" aria-label={entry.source}>
      <div className="flex items-center gap-3 p-5 border-b border-line shrink-0">
        <span className="grid place-items-center size-10 rounded-full bg-bg-elev border border-line text-xl leading-none">{entry.icon}</span>
        <div className="min-w-0">
          <p className="font-title font-medium truncate">{entry.source}</p>
          <p className="text-xs text-fg-faint num">{rel(entry.at)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="ml-auto size-10 rounded-full grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev-2 transition">✕</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-5">
          <p className="text-lg leading-relaxed whitespace-pre-wrap text-pretty">{entry.detail || entry.title}</p>
          {entry.href && (
            <div className="pt-2">
              <Link href={entry.href}><Button phase="green">Open in Explore →</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="m5 12 5 5L20 7" /></svg>;
}
function RefreshIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>;
}
