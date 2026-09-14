"use client";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { SplitPane } from "@/components/ui/split-pane";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { RunProgress } from "@/components/apps/run-progress";
import { ResultPanel } from "@/components/apps/result-panel";
import { TaskView, type PastTask } from "@/components/apps/task-view";
import { useAppRun } from "@/components/apps/use-app-run";
import { scheduleLabel, targetLabel } from "@/components/apps/format";
import { CatalogGrid } from "./catalog";
import { Consultant } from "./consultant";
import { BriefEditor } from "./brief-editor";
import { createDraft, updateDraftAnswers, publishDraft, discardDraft, type DraftResult } from "@/app/(app)/build/actions";
import type { Answers, CatalogApp } from "@/components/apps/types";

type Draft = { instanceId: string; estimateUsd: number; balance: number };

export function BuildClient({ apps, preselect, task, balance, basePath = "/build", intro }: { apps: CatalogApp[]; preselect: string | null; task: PastTask | null; balance: number; basePath?: string; intro?: ReactNode }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(preselect && apps.some((a) => a.slug === preselect) ? preselect : null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [published, setPublished] = useState<{ instanceId: string; live: boolean } | null>(null);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const stream = useAppRun();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showTask, setShowTask] = useState(Boolean(task));
  const [briefOpen, setBriefOpen] = useState(false); // the questions pop-up
  const [chatHint, setChatHint] = useState<string | null>(null);

  const app = apps.find((a) => a.slug === selected) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [stream.frames.length, stream.result, draft, published]);

  const resetAll = useCallback(() => {
    setAnswers(null); setEditing(false); setDraft(null); setSaveErr(null); setPublished(null); setName(""); stream.reset();
  }, [stream]);

  function pick(slug: string) {
    setShowTask(false);
    if (slug !== selected) resetAll();
    setSelected(slug);
    const a = apps.find((x) => x.slug === slug);
    setName(a?.isCustom ? "" : (a?.name ?? ""));
    setBriefOpen(true); // open the questions pop-up
    router.replace(`${basePath}?app=${slug}`, { scroll: false });
  }

  // Submitting the pop-up SAVES the answers as a draft (it doesn't run yet — you run it from the chat).
  function onAnswers(a: Answers) {
    if (!app) return;
    setAnswers(a);
    setEditing(false);
    setSaveErr(null);
    stream.reset();
    setBriefOpen(false);
    if (app.isCustom) setName(String(a.what ?? "").slice(0, 60));
    start(async () => {
      const r: DraftResult = draft ? await updateDraftAnswers(draft.instanceId, a) : await createDraft(app.slug, a);
      if (!r.ok) { setSaveErr(r.error); return; }
      setDraft({ instanceId: r.instanceId, estimateUsd: r.estimateUsd, balance: r.balance });
    });
  }

  const runDraft = () => { if (draft && !stream.running) void stream.run(draft.instanceId, { preview: true }); };

  // free-text in the chat → try to match an app by name/tag, else a friendly nudge
  const handleSend = (text: string) => {
    const q = text.toLowerCase().trim();
    const m = apps.find((a) => !a.isCustom && (a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase().split(" ")[0]) || (a.tags ?? []).some((t) => q.includes(t.toLowerCase()))));
    setChatHint(m ? null : `I couldn't match "${text.slice(0, 40)}" to an app yet — tap one on the left and I'll take it from there.`);
    if (m) pick(m.slug);
  };

  function publish() {
    if (!draft) return;
    start(async () => {
      const r = await publishDraft(draft.instanceId, name);
      if (!r.ok) { setSaveErr(r.error); return; }
      setPublished({ instanceId: r.instanceId, live: r.live });
      router.refresh();
    });
  }

  function discard() {
    if (!draft) return;
    start(async () => {
      await discardDraft(draft.instanceId);
      resetAll();
    });
  }

  const insufficient = draft && !stream.running && !stream.result && draft.balance < draft.estimateUsd;
  const runFailed = draft && !stream.running && !stream.result && (stream.blocked || stream.error);

  return (
    <>
      {/* the questions — a Typeform-style pop-up; submitting saves a draft */}
      {briefOpen && app && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={app.name}>
          <div className="fixed inset-0 bg-fg/40 backdrop-blur-sm" onClick={() => setBriefOpen(false)} aria-hidden />
          <div className="relative w-full max-w-2xl my-4 squircle rounded-5 border border-line bg-bg shadow-lift p-6 md:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl leading-none">{app.icon}</span>
                <div className="min-w-0">
                  <h2 className="font-title text-xl font-medium truncate">{app.isCustom ? "Your own app" : app.name}</h2>
                  <p className="text-sm text-fg-muted">A few quick questions — we&apos;ll save them as a draft.</p>
                </div>
              </div>
              <button type="button" onClick={() => setBriefOpen(false)} aria-label="Close" className="size-9 rounded-full grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev-2 transition shrink-0">✕</button>
            </div>
            {app.briefTemplate
              ? <BriefEditor key={editing ? "edit" : "new"} app={app} initial={answers ?? undefined} onSubmit={onAnswers} busy={pending} submitLabel="Save as draft →" />
              : <Consultant key={editing ? "edit" : "new"} app={app} initial={answers ?? undefined} onComplete={onAnswers} busy={pending} />}
          </div>
        </div>
      )}

      <SplitPane
        storageKey="all41-chat-split"
        defaultPct={66}
        min={24}
        max={80}
        fill
        left={
          /* LEFT — the apps you can use (2/3) */
          <aside className="space-y-4 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">What you can do</h2>
              <p className="text-sm text-fg-muted">Tap one and I&apos;ll walk you through it. Credit: <Money usd={balance} className="text-fg" /></p>
            </div>
            <CatalogGrid apps={apps} selected={selected} onOpen={(slug) => pick(slug)} />
          </aside>
        }
        right={
          /* RIGHT — the chatroom (1/3) */
          <section className="flex flex-col min-w-0 gap-3 lg:h-full lg:min-h-0">
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto space-y-4 pr-1">
              {intro}
              {chatHint && <AIMsg className="text-fg-muted">{chatHint}</AIMsg>}

              {showTask && task ? (
                <TaskView task={task} />
              ) : !app ? (
                <AIMsg>Pick an app on the left, or tell me what you need below — I&apos;ll ask a few quick questions and run it for you.</AIMsg>
              ) : (
                <>
                  <AIMsg>Let&apos;s set up <span className="font-medium text-fg">{app.isCustom ? "your own app" : app.name}</span>.{(answers || draft) && !published ? <> <button type="button" className="text-green underline ml-1" onClick={() => { if (draft) discard(); else resetAll(); }}>start over</button></> : null}</AIMsg>

                  {!answers && (
                    <AIMsg>A few quick questions first — <button type="button" className="text-green underline" onClick={() => setBriefOpen(true)}>open the form →</button></AIMsg>
                  )}

                  {saveErr && <Card className="border-red/40 text-red text-sm">{saveErr}</Card>}
                  {answers && !draft && pending && <AIMsg className="pulse-soft text-fg-muted">Saving your brief…</AIMsg>}

                  {draft && !published && !stream.result && stream.frames.length === 0 && !stream.running && (
                    <Card className="space-y-3 border-green/30">
                      <CardTitle>Brief saved as a draft ✓</CardTitle>
                      <CardHint>Try it once for real — about <Money usd={draft.estimateUsd} />, and nothing is charged until it runs.</CardHint>
                      {insufficient ? (
                        <div className="flex gap-2 flex-wrap">
                          <Link href="/settings/billing"><Button size="sm" phase="green">Top up</Button></Link>
                          <Button size="sm" phase="ghost" onClick={() => setBriefOpen(true)}>Edit brief</Button>
                          <Button size="sm" phase="ghost" className="text-red border-red/30" onClick={discard}>Discard</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <Button phase="green" disabled={pending} onClick={runDraft}>Try it now →</Button>
                          <Button phase="ghost" onClick={() => setBriefOpen(true)}>Edit brief</Button>
                          <Button phase="ghost" className="text-red border-red/30" onClick={discard}>Discard</Button>
                        </div>
                      )}
                    </Card>
                  )}

                  {(stream.running || stream.frames.length > 0) && <RunProgress frames={stream.frames} running={stream.running} />}

                  {stream.result && (
                    <div className="space-y-4">
                      <ResultPanel title="Here's what it made" result={stream.result.result as { output?: unknown }} billedUsd={stream.result.billedUsd} />
                      {!published && (
                        <Card className="space-y-4 border-green/30">
                          <CardTitle className="text-xl">Happy with it?</CardTitle>
                          <CardHint>
                            {scheduleLabel(String(answers?.schedule ?? "once").toLowerCase())}, {targetLabel(String(answers?.output_target ?? "chat").toLowerCase())}.
                            {String(answers?.schedule ?? "once").toLowerCase() === "once" ? " This try-out was the run — publishing keeps it in My Apps." : " Publishing puts the next run on your calendar."}
                          </CardHint>
                          <div className="flex gap-2 items-center flex-wrap">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this app" className="max-w-xs" aria-label="App name" />
                            <Button phase="green" disabled={pending} onClick={publish}>Publish to My Apps</Button>
                            <Button phase="ghost" disabled={pending} onClick={() => setBriefOpen(true)}>Change answers</Button>
                            <Button phase="ghost" className="text-red border-red/30" disabled={pending} onClick={discard}>Discard</Button>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {runFailed && !insufficient && (
                    <div className="flex gap-2 flex-wrap">
                      <Button phase="ghost" size="sm" onClick={runDraft}>Try again</Button>
                      <Button phase="ghost" size="sm" onClick={() => setBriefOpen(true)}>Change answers</Button>
                      <Button phase="ghost" size="sm" className="text-red border-red/30" onClick={discard}>Discard</Button>
                    </div>
                  )}

                  {published && (
                    <Card className="space-y-3 border-green/30 bg-green-soft">
                      <CardTitle className="text-2xl">It&apos;s in My Apps.</CardTitle>
                      <CardHint>{published.live ? "It'll run on schedule — the next run is on your calendar." : "It ran once and the result is saved. You can run it again any time from My Apps."}</CardHint>
                      <div className="flex gap-4 text-sm">
                        <Link href={`/my-apps?id=${published.instanceId}`} className="text-green underline">Open it in My Apps →</Link>
                        <button type="button" className="text-fg-muted underline" onClick={() => { resetAll(); setSelected(null); router.replace(basePath, { scroll: false }); }}>Start something new</button>
                      </div>
                    </Card>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            <ChatInput onSend={handleSend} />
          </section>
        }
      />
    </>
  );
}

function AIMsg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center size-8 rounded-full bg-amber-soft text-amber font-title font-bold text-sm shrink-0">a</span>
      <div className={cn("squircle rounded-3 bg-bg-elev border border-line px-4 py-3 text-sm leading-relaxed min-w-0", className)}>{children}</div>
    </div>
  );
}

function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => { if (text.trim()) { onSend(text); setText(""); } };
  return (
    <div className="shrink-0 bg-bg/80 backdrop-blur pt-2 border-t border-line">
      <div className="flex items-center gap-2 squircle rounded-full border border-line bg-bg-elev pl-4 pr-1.5 py-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Tell me what you need…"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          aria-label="Message"
        />
        <Button size="sm" phase="green" disabled={!text.trim()} onClick={submit}>Send</Button>
      </div>
    </div>
  );
}
