"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type MiniApp = { slug: string; name: string; icon: string; tags: string[] };
type Msg = { who: "ai" | "me"; node: ReactNode };

/** The right 1/3 of Home: an always-on personal assistant. It takes what you say and hands it to the run flow. */
export function HomeAssistant({ apps, name }: { apps: MiniApp[]; name: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const starters = apps.slice(0, 4);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  const go = (slug: string) => router.push(`/chat?app=${slug}`);

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
    <section className="flex flex-col h-full min-h-0">
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto space-y-4 pr-1">
        <Bubble who="ai">
          <p className="font-medium text-fg">Hi {name} — I&apos;m your assistant.</p>
          <p className="mt-1 text-fg-muted">Tell me what you want done and I&apos;ll run it for you. The result lands in your journal on the left.</p>
          <Picks starters={starters} onGo={go} />
        </Bubble>

        {msgs.map((m, i) => (
          <Bubble key={i} who={m.who}>{m.node}</Bubble>
        ))}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={send} />
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

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => { if (text.trim()) { onSend(text); setText(""); } };
  return (
    <div className="shrink-0 bg-bg/80 backdrop-blur pt-2 border-t border-line">
      <div className="flex items-center gap-2 squircle rounded-full border border-line bg-bg-elev pl-4 pr-1.5 py-1.5">
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
