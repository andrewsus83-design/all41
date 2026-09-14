"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
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

export function BuildClient({ apps, preselect, task, balance, basePath = "/build" }: { apps: CatalogApp[]; preselect: string | null; task: PastTask | null; balance: number; basePath?: string }) {
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
    router.replace(`${basePath}?app=${slug}`, { scroll: false });
  }

  function onAnswers(a: Answers) {
    if (!app) return;
    setAnswers(a);
    setEditing(false);
    setSaveErr(null);
    stream.reset();
    if (app.isCustom) setName(String(a.what ?? "").slice(0, 60));
    start(async () => {
      const r: DraftResult = draft ? await updateDraftAnswers(draft.instanceId, a) : await createDraft(app.slug, a);
      if (!r.ok) { setSaveErr(r.error); return; }
      const d = { instanceId: r.instanceId, estimateUsd: r.estimateUsd, balance: r.balance };
      setDraft(d);
      if (r.balance >= r.estimateUsd) void stream.run(r.instanceId, { preview: true });
    });
  }

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

  const backToApps = () => { resetAll(); setSelected(null); setShowTask(false); router.replace(basePath, { scroll: false }); };
  const inApp = !!app || (showTask && !!task);

  return (
    <div className="relative min-h-[55vh]">
      {/* catalog — the apps you can build */}
      {!inApp && (
        <div key="catalog" className="slide-fade space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl">Apps <span className="num text-fg-faint">{apps.filter((a) => !a.isCustom).length}</span></h2>
            <p className="text-sm text-fg-muted">Tap one to build it — it opens full-screen. Credit: <Money usd={balance} className="text-fg" /></p>
          </div>
          <CatalogGrid apps={apps} selected={selected} onOpen={(slug) => pick(slug)} />
        </div>
      )}

      {/* the chosen app, full-screen — slides in from the catalog */}
      {inApp && (
      <section className="slide-in-right max-w-4xl mx-auto space-y-6 min-w-0">
        <button type="button" onClick={backToApps} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition">← Apps</button>
        {showTask && task ? (
          <TaskView task={task} />
        ) : !app ? (
          <Card className="space-y-3">
            <CardTitle className="text-2xl">Pick an app on the left, or start from scratch.</CardTitle>
            <CardHint>A consultant walks you through a few questions, runs it once so you can see the real thing, then you decide whether to keep it.</CardHint>
          </Card>
        ) : (
          <>
            <header className="flex items-center gap-4">
              <span className="text-4xl leading-none">{app.icon}</span>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold truncate">{app.isCustom ? "Your own app" : app.name}</h1>
                <p className="text-sm text-fg-muted">Fill in the brief, try it, then publish.</p>
              </div>
              {(answers || draft) && !published && <Button phase="ghost" size="sm" className="ml-auto" disabled={pending || stream.running} onClick={() => { if (draft) discard(); else resetAll(); }}>Start over</Button>}
            </header>

            {(!answers || editing) && (app.briefTemplate
              ? <BriefEditor key={editing ? "edit" : "new"} app={app} initial={editing && answers ? answers : undefined} onSubmit={onAnswers} busy={pending || stream.running} />
              : <Consultant key={editing ? "edit" : "new"} app={app} initial={editing && answers ? answers : undefined} onComplete={onAnswers} busy={pending || stream.running} />)}

            {answers && !editing && (
              <Card className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Your answers</CardTitle>
                  {!published && <button type="button" className="text-sm text-fg-muted hover:text-fg" disabled={pending || stream.running} onClick={() => setEditing(true)}>Change answers</button>}
                </div>
                <ul className="text-sm text-fg-muted space-y-1">
                  {app.questions.map((q) => <li key={q.key}><span className="text-fg-faint">{q.question}</span> <span className="text-fg">{Array.isArray(answers[q.key]) ? (answers[q.key] as string[]).join(", ") : String(answers[q.key] ?? "")}</span></li>)}
                </ul>
              </Card>
            )}

            {saveErr && <Card className="border-red/40 text-red text-sm">{saveErr}</Card>}
            {pending && !draft && answers && <p className="text-sm text-fg-muted pulse-soft px-2">Saving your answers…</p>}

            {draft && !published && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-fg-muted px-2">
                  <span>Trying it costs about <Money usd={draft.estimateUsd} className="text-fg" /></span>
                  <span>·</span>
                  <span>credit <Money usd={stream.estimate?.balance ?? draft.balance} className="text-fg" /></span>
                </div>
                {insufficient && (
                  <Card className="space-y-3 border-amber/30">
                    <CardTitle className="text-xl">Top up to try this</CardTitle>
                    <CardHint>This try-out needs about <Money usd={draft.estimateUsd} /> and you have <Money usd={draft.balance} />. Nothing has been charged.</CardHint>
                    <div className="flex gap-3">
                      <Link href="/settings/billing"><Button phase="green" size="sm">Top up</Button></Link>
                      <Button phase="ghost" size="sm" onClick={() => setEditing(true)}>Change answers</Button>
                      <Button phase="ghost" size="sm" className="text-red border-red/30" onClick={discard}>Discard</Button>
                    </div>
                  </Card>
                )}
                {(stream.running || stream.frames.length > 0) && <RunProgress frames={stream.frames} running={stream.running} />}
                {stream.result && (
                  <div className="space-y-5">
                    <ResultPanel title="Here's what it made" result={stream.result.result as { output?: unknown }} billedUsd={stream.result.billedUsd} />
                    <Card className="space-y-4 border-green/30">
                      <CardTitle className="text-xl">Happy with it?</CardTitle>
                      <CardHint>
                        {scheduleLabel(String(answers?.schedule ?? "once").toLowerCase())}, {targetLabel(String(answers?.output_target ?? "chat").toLowerCase())}.
                        {String(answers?.schedule ?? "once").toLowerCase() === "once" ? " This try-out was the run — publishing keeps it in My Apps." : " Publishing puts the next run on your calendar."}
                      </CardHint>
                      <div className="flex gap-3 items-center flex-wrap">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this app" className="max-w-xs" aria-label="App name" />
                        <Button phase="green" disabled={pending} onClick={publish}>Publish to My Apps</Button>
                        <Button phase="ghost" disabled={pending} onClick={() => setEditing(true)}>Change answers</Button>
                        <Button phase="ghost" className="text-red border-red/30" disabled={pending} onClick={discard}>Discard</Button>
                      </div>
                    </Card>
                  </div>
                )}
                {runFailed && !insufficient && (
                  <div className="flex gap-3">
                    <Button phase="ghost" size="sm" onClick={() => void stream.run(draft.instanceId, { preview: true })}>Try again</Button>
                    <Button phase="ghost" size="sm" onClick={() => setEditing(true)}>Change answers</Button>
                    <Button phase="ghost" size="sm" className="text-red border-red/30" onClick={discard}>Discard</Button>
                  </div>
                )}
              </div>
            )}

            {published && (
              <Card className="space-y-3 border-green/30 bg-green-soft">
                <CardTitle className="text-2xl">It&apos;s in My Apps.</CardTitle>
                <CardHint>{published.live ? "It'll run on schedule — the next run is on your calendar. You can attach your own data, edit answers, or run it any time." : "It ran once and the result is saved. You can run it again any time from My Apps."}</CardHint>
                <div className="flex gap-4 text-sm">
                  <Link href={`/my-apps?id=${published.instanceId}`} className="text-green underline">Open it in My Apps →</Link>
                  <button type="button" className="text-fg-muted underline" onClick={() => { resetAll(); setSelected(null); router.replace(basePath, { scroll: false }); }}>Build another</button>
                </div>
              </Card>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </section>
      )}
    </div>
  );
}
