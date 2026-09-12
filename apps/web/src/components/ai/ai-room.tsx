"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";

export type RoomApp = { id: string; name: string; icon: string | null; status: string };
export type RoomSheet = { id: string; name: string; icon: string | null };
export type RoomThread = { id: string; title: string; updatedAt: string };
export type RoomMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  billedUsd: number;
  meta: { guardrail?: boolean; isMock?: boolean; model?: string; suggests?: Array<{ id: string; name: string }> } | null;
  createdAt: string;
};
type Scope = { app_instance_ids: string[]; sheet_ids: string[] };

type Frame =
  | { status: string; detail?: string }
  | { done: true; threadId: string; user: ServerMsg; assistant: ServerMsg; balance: number | null }
  | { blocked: true; message: string }
  | { error: true; message: string };
type ServerMsg = { id: string; role: string; content: string; cost_usd: number; billed_usd: number; meta: RoomMessage["meta"]; created_at: string };

function toMsg(m: ServerMsg): RoomMessage {
  return { id: m.id, role: m.role as RoomMessage["role"], content: m.content, billedUsd: Number(m.billed_usd ?? 0), meta: m.meta ?? null, createdAt: m.created_at };
}

function Chip({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "squircle h-10 px-4 rounded-2 border text-sm font-title font-medium transition inline-flex items-center gap-2 disabled:cursor-default",
        active ? "bg-fg text-bg border-transparent" : "bg-bg-elev border-line-strong text-fg-muted enabled:hover:text-fg enabled:hover:bg-bg-elev-2",
        disabled && !active && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function AiRoom({
  apps, sheets, threads, active, preselectSheetIds,
}: {
  apps: RoomApp[];
  sheets: RoomSheet[];
  threads: RoomThread[];
  active: { id: string; scope: Scope; messages: RoomMessage[] } | null;
  preselectSheetIds: string[];
}) {
  const router = useRouter();
  const [threadId, setThreadId] = useState<string | null>(active?.id ?? null);
  const [scope, setScope] = useState<Scope>(active?.scope ?? { app_instance_ids: [], sheet_ids: preselectSheetIds });
  const [messages, setMessages] = useState<RoomMessage[]>(active?.messages ?? []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "red" | "amber"; text: string; topUp?: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const locked = messages.length > 0 || threadId !== null; // scope is fixed once the thread exists
  const hasScope = scope.app_instance_ids.length + scope.sheet_ids.length > 0;
  const scopedApps = apps.filter((a) => scope.app_instance_ids.includes(a.id));
  const scopedSheets = sheets.filter((s) => scope.sheet_ids.includes(s.id));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  function toggle(kind: keyof Scope, id: string) {
    if (locked) return;
    setScope((s) => ({ ...s, [kind]: s[kind].includes(id) ? s[kind].filter((x) => x !== id) : [...s[kind], id] }));
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || !hasScope) return;
    setSending(true);
    setNotice(null);
    setInput("");
    setStatus("Sending");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message, scope: threadId ? undefined : scope }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        setNotice({ tone: "red", text: j?.message ?? `Something went wrong (HTTP ${res.status}).` });
        setInput(message);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          const line = f.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const ev = JSON.parse(line.slice(6)) as Frame;
          if ("status" in ev) setStatus(ev.detail ?? ev.status);
          else if ("done" in ev) {
            setMessages((prev) => [...prev, toMsg(ev.user), toMsg(ev.assistant)]);
            if (!threadId) {
              setThreadId(ev.threadId);
              window.history.replaceState(null, "", `/ai?thread=${ev.threadId}`);
            }
            router.refresh();
          } else if ("blocked" in ev) {
            setNotice({ tone: "amber", text: ev.message, topUp: true });
            setInput(message);
            router.refresh();
          } else if ("error" in ev) {
            setNotice({ tone: "red", text: ev.message });
            setInput(message);
            router.refresh();
          }
        }
      }
    } catch (e) {
      setNotice({ tone: "red", text: e instanceof Error ? e.message : String(e) });
      setInput(message);
    } finally {
      setSending(false);
      setStatus(null);
    }
  }

  async function remove(id: string) {
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/ai/threads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not delete (HTTP ${res.status}).`);
      if (id === threadId) router.push("/ai");
      else router.refresh();
    } catch (e) {
      setNotice({ tone: "red", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setDeleting(null);
    }
  }

  const firstApp = scopedApps[0]?.name ?? apps[0]?.name ?? null;
  const firstSheet = scopedSheets[0]?.name ?? null;
  const suggestions = [
    firstApp ? `What should I change in ${firstApp} to make it more useful?` : null,
    "Summarize what the last 3 runs found",
    firstSheet ? `What's missing from ${firstSheet}?` : firstApp ? `Is ${firstApp} worth its cost so far?` : null,
  ].filter((s): s is string => Boolean(s));

  return (
    <div className="grid grid-cols-[260px_1fr] gap-10 max-w-6xl">
      {/* left rail: threads */}
      <aside className="space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Threads</p>
          <Link href="/ai" className="text-xs text-green hover:underline">+ New</Link>
        </div>
        {threads.length === 0 && <p className="text-sm text-fg-faint">No threads yet. Pick an app and ask the first question.</p>}
        <ul className="space-y-1">
          {threads.map((t) => {
            const isActive = t.id === threadId;
            return (
              <li key={t.id} className="group relative">
                <Link
                  href={`/ai?thread=${t.id}`}
                  className={cn("block squircle rounded-2 px-4 py-3 pr-9 transition border", isActive ? "bg-bg-elev-2 border-line-strong" : "border-transparent hover:bg-bg-elev")}
                >
                  <p className="text-sm truncate">{t.title}</p>
                  <p className="text-xs text-fg-faint num">{t.updatedAt.slice(0, 10)}</p>
                </Link>
                <button
                  type="button"
                  aria-label={`Delete thread ${t.title}`}
                  title="Delete"
                  disabled={deleting === t.id}
                  onClick={() => remove(t.id)}
                  className="absolute right-2 top-3 size-6 rounded-1 text-fg-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red hover:bg-bg-elev-2 transition disabled:opacity-40"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* main pane */}
      <section className="space-y-6 min-w-0">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold">Think tank</h1>
          <p className="text-fg-muted">A room for your apps and what they found. Ask how to make an app better, or what the last runs mean. Nothing else — that keeps it sharp and cheap.</p>
        </header>

        {/* scope picker */}
        <div className="space-y-3 rounded-4 border border-line bg-bg-elev p-5 squircle">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xs uppercase tracking-wide text-fg-faint">{locked ? "This thread is about" : "Pick what this thread is about"}</p>
            {locked && <p className="text-xs text-fg-faint">Start a new thread to change the scope.</p>}
          </div>
          {apps.length === 0 && sheets.length === 0 ? (
            <p className="text-sm text-fg-muted">
              You have no apps yet. <Link href="/my-apps" className="text-green hover:underline">Set one up</Link> and come back — the room needs something to think about.
            </p>
          ) : (
            <div className="space-y-3">
              {apps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {apps.map((a) => (
                    <Chip key={a.id} active={scope.app_instance_ids.includes(a.id)} disabled={locked} onClick={() => toggle("app_instance_ids", a.id)}>
                      <span aria-hidden>{a.icon ?? "◻"}</span>
                      {a.name}
                    </Chip>
                  ))}
                </div>
              )}
              {sheets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sheets.map((s) => (
                    <Chip key={s.id} active={scope.sheet_ids.includes(s.id)} disabled={locked} onClick={() => toggle("sheet_ids", s.id)}>
                      <span aria-hidden>{s.icon ?? "▦"}</span>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              )}
              {!locked && !hasScope && <p className="text-xs text-fg-faint">Choose at least one app or sheet before the first message.</p>}
            </div>
          )}
        </div>

        {/* messages */}
        <div className="space-y-4">
          {messages.length === 0 && !sending && (
            <p className="text-sm text-fg-faint">{hasScope ? "Ask the first question, or tap one below." : "Nothing here yet."}</p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          {sending && status && (
            <div className="flex items-center gap-3 text-sm text-fg-muted">
              <span className="inline-block size-2.5 rounded-full bg-amber pulse-soft" />
              {status}…
            </div>
          )}
          {notice && (
            <div className={cn("rounded-2 border px-5 py-4 text-sm", notice.tone === "amber" ? "border-amber/30 bg-amber-soft text-fg" : "border-red/30 bg-red-soft text-fg")}>
              {notice.text}{" "}
              {notice.topUp && (
                <Link href="/settings/billing" className="text-green hover:underline">Top up</Link>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        <div className="space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={hasScope ? "Ask about your apps or their results…" : "Pick an app or sheet first"}
            disabled={!hasScope || sending}
            className="min-h-24"
            aria-label="Message"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-fg-faint">Enter to send · Shift+Enter for a new line · each reply shows its cost</p>
            <Button size="sm" phase="green" onClick={() => void send(input)} disabled={!hasScope || sending || !input.trim()}>
              {sending ? "Thinking…" : "Send"}
            </Button>
          </div>
          {messages.length === 0 && hasScope && !sending && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="squircle rounded-2 border border-line bg-bg-elev px-4 py-2 text-sm text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MessageBubble({ m }: { m: RoomMessage }) {
  const isUser = m.role === "user";
  const guard = Boolean(m.meta?.guardrail);
  const suggests = m.meta?.suggests ?? [];
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[48rem] space-y-3 rounded-3 px-5 py-4 squircle", isUser ? "bg-bg-elev-2 text-fg" : guard ? "bg-amber-soft border border-amber/20" : "bg-bg-elev border border-line")}>
        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
        {!isUser && suggests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggests.map((s) => (
              <Link
                key={s.id}
                href={`/my-apps?id=${s.id}`}
                className="squircle inline-flex h-9 items-center rounded-1 border border-line-strong px-4 text-sm font-title font-medium text-fg hover:bg-bg-elev-2 transition"
              >
                Open {s.name} to edit
              </Link>
            ))}
          </div>
        )}
        {!isUser && (
          <p className="text-xs text-fg-faint flex items-center gap-2">
            <Money usd={m.billedUsd} precision={4} />
            {guard && <span>· not about your apps, so nothing was charged</span>}
            {m.meta?.isMock && <span>· offline mode</span>}
          </p>
        )}
      </div>
    </div>
  );
}
