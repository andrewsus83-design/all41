"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { cn } from "@/lib/cn";
import { completeOnboarding, type OnboardResult } from "./actions";

const ROLES = ["Founder", "Consultant", "Agency owner", "Freelancer", "Other"];

export function OnboardingClient() {
  const [role, setRole] = useState<string | null>(null);
  const [niche, setNiche] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<OnboardResult | null>(null);

  function go() {
    if (!role) return;
    start(async () => setDone(await completeOnboarding(role, niche)));
  }

  if (done?.ok) {
    const r = done.result as { output?: unknown; schema?: string; isMock?: boolean; modelsUsed?: string[] };
    return (
      <div className="space-y-6">
        <Card className="border-green/30 bg-green-soft space-y-2">
          <CardTitle className="text-2xl">Your first Morning Briefing is ready.</CardTitle>
          <p className="text-fg-muted">Topic: {done.topic}. It cost <Money usd={done.billedUsd} /> from your free credit — no keys, no setup.</p>
        </Card>
        <ResultView output={r.output} schema={r.schema} isMock={r.isMock} modelsUsed={r.modelsUsed} />
        <Card className="space-y-4">
          <CardTitle className="text-xl">Next three things</CardTitle>
          <ol className="space-y-3">
            {[
              { href: "/build", n: "1", t: "Try a briefing in Chat", d: "Five taps. One question at a time. See the cost before you run." },
              { href: "/data", n: "2", t: "Add your notes in Data", d: "Paste anything. Every task gets grounded in your own context." },
              { href: "/my-apps", n: "3", t: "Pick another app", d: "Competitor Crawler or Content Pipeline — configured by chat in 20 seconds." },
            ].map((i) => (
              <li key={i.n}>
                <Link href={i.href} className="flex items-start gap-4 squircle rounded-3 border border-line px-5 py-4 hover:bg-bg-elev-2 transition">
                  <span className="num text-green text-xl">{i.n}</span>
                  <span><span className="font-title font-medium block">{i.t}</span><span className="text-sm text-fg-muted">{i.d}</span></span>
                </Link>
              </li>
            ))}
          </ol>
          <Link href="/chat"><Button phase="green" size="lg">Go to Chat →</Button></Link>
        </Card>
      </div>
    );
  }

  if (done && !done.ok) {
    return (
      <Card className="space-y-4 border-amber/30">
        <CardTitle className="text-xl">{done.blocked ? "Almost there" : "First run didn’t finish"}</CardTitle>
        <CardHint>{done.error}</CardHint>
        <div className="flex gap-3">
          <Link href="/chat"><Button phase="green">Continue to Chat</Button></Link>
          {done.blocked && <Link href="/settings/billing"><Button phase="ghost">Top up</Button></Link>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 border-red/30">
      <div className="flex flex-wrap gap-3">
        {ROLES.map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)} className={cn("squircle h-14 px-7 rounded-3 border text-lg font-title font-medium transition", role === r ? "bg-red text-white border-transparent" : "bg-bg-elev border-line-strong text-fg-muted hover:text-fg hover:bg-bg-elev-2")}>{r}</button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-fg-muted">Your niche, in a few words (optional — it becomes your first briefing topic)</p>
        <Input placeholder="e.g. AI tools for real-estate agents in Indonesia" value={niche} onChange={(e) => setNiche(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      </div>
      <div className="flex items-center gap-4">
        <Button phase="green" size="lg" disabled={!role || pending} onClick={go}>{pending ? "Running your first briefing…" : "Run my first briefing"}</Button>
        <span className="text-sm text-fg-faint">Uses ≈ $0.02 of your free $2.</span>
      </div>
      {pending && <p className="text-sm text-fg-muted pulse-soft">Searching → summarizing → metering. About 10 seconds.</p>}
    </Card>
  );
}
