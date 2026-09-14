"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type MiniApp = { slug: string; name: string; icon: string; tags: string[] };
type Msg = { who: "ai" | "me"; node: ReactNode };

/** The right 1/3 of Home: an always-on personal assistant. Chat grows from the bottom up;
 * the composer travels with the conversation unless the user pins it to the bottom. */
export function HomeAssistant({ apps, name }: { apps: MiniApp[]; name: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pinned, setPinned] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const starters = apps.slice(0, 4);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (localStorage.getItem("all41-assistant-pin") === "1") setPinned(true); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  const go = (slug: string) => router.push(`/chat?app=${slug}`);
  const togglePin = () => setPinned((v) => { const n = !v; try { localStorage.setItem("all41-assistant-pin", n ? "1" : "0"); } catch {} return n; });

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const q = t.toLowerCase();
    const m = apps.find((a) => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase().split(" ")[0]) || a.tags.some((tag) => q.includes(tag.toLowerCase())));
    setMsgs((prev) => [
      ...prev,
      { who: "me", node: t },
      m
        ? { who: "ai", node: <>On it — opening <span className="font-medium text-fg">{m.name}</span> so we can set it up.</> }
        : { who: "ai", node: <><p>I&apos;ll handle free-form soon. For now, pick one and I&apos;ll take it from there:</p><Picks starters={starters} onGo={go} /></> },
    ]);
    if (m) setTimeout(() => go(m.slug), 450);
  };

  return (
    <section className="flex flex-col lg:h-full lg:min-h-0">
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-1">
        <div className="lg:min-h-full flex flex-col gap-4">
          {/* spacer — pushes the whole conversation to the bottom on desktop */}
          <div className="hidden lg:block mt-auto" aria-hidden />

          <Bubble who="ai">
            <p className="font-medium text-fg">Hi {name} — I&apos;m your assistant.</p>
            <p className="mt-1 text-fg-muted">Tell me what you want done and I&apos;ll run it for you. The result lands in your journal on the left.</p>
            <Picks starters={starters} onGo={go} />
          </Bubble>

          {msgs.map((m, i) => (
            <Bubble key={i} who={m.who}>{m.node}</Bubble>
          ))}
          <div ref={bottomRef} />

          <Composer onSend={send} pinned={pinned} onTogglePin={togglePin} />
        </div>
      </div>
    </section>
  );
}

function Picks({ starters, onGo }: { starters: MiniApp[]; onGo: (slug: string) => void }) {
  if (starters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {starters.map((a) => (
        <button key={a.slug} type="button" onClick={() => onGo(a.slug)} className="squircle inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-elev px-3 py-1.5 text-sm hover:border-green/40 hover:bg-green-soft transition">
          <span className="text-base leading-none">{a.icon}</span>{a.name}
        </button>
      ))}
    </div>
  );
}

function Bubble({ who, children }: { who: "ai" | "me"; children: ReactNode }) {
  if (who === "me") {
    return (
      <div className="flex justify-end">
        <div className="squircle rounded-3 bg-green-soft text-fg border border-green/20 px-4 py-2.5 text-sm leading-relaxed max-w-[85%]">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center size-8 rounded-full bg-amber-soft text-amber font-title font-bold text-sm shrink-0">a</span>
      <div className="squircle rounded-3 bg-bg-elev border border-line px-4 py-3 text-sm leading-relaxed min-w-0 space-y-1">{children}</div>
    </div>
  );
}

function PinIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3h6l-1.2 5.3 3.2 3.2H7l3.2-3.2L9 3Z" />
      <path d="M12 14v7" />
    </svg>
  );
}

function Composer({ onSend, pinned, onTogglePin }: { onSend: (text: string) => void; pinned: boolean; onTogglePin: () => void }) {
  const [text, setText] = useState("");
  const submit = () => { if (text.trim()) { onSend(text); setText(""); } };
  return (
    <div className={cn("pt-1", pinned && "lg:sticky lg:bottom-0 lg:z-10 bg-bg/90 backdrop-blur")}>
      <div className="flex items-center gap-1.5 squircle rounded-full border border-line bg-bg-elev pl-1.5 pr-1.5 py-1.5">
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          title={pinned ? "Unpin — let the box travel with the chat" : "Pin the box to the bottom"}
          className={cn("size-8 rounded-full grid place-items-center shrink-0 transition", pinned ? "text-coral bg-coral-soft" : "text-fg-faint hover:text-fg hover:bg-bg-elev-2")}
        >
          <PinIcon on={pinned} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="What do you need done?"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          aria-label="Message your assistant"
        />
        <Button size="sm" phase="green" disabled={!text.trim()} onClick={submit}>Send</Button>
      </div>
    </div>
  );
}
