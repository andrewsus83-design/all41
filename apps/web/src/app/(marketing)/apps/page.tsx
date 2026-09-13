import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Pipeline } from "@/components/marketing/pipeline";
import { RoadmapCard } from "@/components/marketing/app-card";
import { Eyebrow, Lead, N, Section, SectionHead, TextLink } from "@/components/marketing/primitives";
import { APP_META, ROADMAP_APPS, SCHEMA_WORDS } from "@/content/apps";
import { getLeaders, getPublishedApps, lastLlmSchema, pipelineChips, scheduleOptions } from "../_lib/data";

export const metadata: Metadata = {
  title: "Apps",
  description: "Build your app once. Pay as you go. Ready-made jobs — briefing, competitor tracking, content — configured in chat, priced per run.",
};

export default async function AppsPage() {
  const [apps, leaders] = await Promise.all([getPublishedApps(), getLeaders()]);
  return (
    <>
      <Section className="pt-16 md:pt-24 pb-10">
        <div className="space-y-6 max-w-3xl mx-auto flex flex-col items-center text-center">
          <Eyebrow phase="green">Apps</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">Ready-made tools. Just answer a few questions.</h1>
          <Lead>For each job, all41 picks the right AI, gives it only what it needs, and combines the best tools behind the scenes — sharper results, no dozen subscriptions, nothing to learn.</Lead>
        </div>
      </Section>

      <Section className="pt-6 space-y-8">
        {apps.length === 0 ? <p className="text-fg-faint">No apps published yet.</p> : null}
        {apps.map((a) => {
          const meta = APP_META[a.slug];
          const schema = lastLlmSchema(a.steps);
          const cadence = scheduleOptions(a.questions);
          return (
            <Card key={a.id} className="p-7 md:p-9 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="text-5xl" aria-hidden>{a.icon ?? "◻"}</span>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl md:text-3xl">{a.name}</CardTitle>
                    <CardHint className="text-base">{a.description}</CardHint>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">How it works</p>
                  <Pipeline chips={pipelineChips(a.steps, leaders)} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/my-apps/${a.slug}`}><Button phase="green">Set it up in <N>20</N> seconds</Button></Link>
                  <TextLink href={`/apps/${a.slug}`} className="text-fg-muted">Details and a sample result</TextLink>
                </div>
              </div>
              <div className="squircle rounded-3 border border-line bg-bg p-5 space-y-4 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">What to expect</p>
                <Expect k="You get">{schema ? SCHEMA_WORDS[schema] : "a structured result with sources"}</Expect>
                <Expect k="Runs">{cadence.length ? cadence.map((c) => c.toLowerCase()).join(" · ") : "once"}</Expect>
                <Expect k="Asks you">
                  <N>{a.questions.length}</N> questions — {a.questions.map((q) => q.question.replace(/\?$/, "").toLowerCase()).join(", ")}
                </Expect>
                <Expect k="Cost">
                  ≈ <Money usd={a.est_credit_cost} /> per run{meta ? <span className="text-fg-faint"> · instead of {meta.replaces}</span> : null}
                </Expect>
              </div>
            </Card>
          );
        })}
      </Section>

      <Section>
        <SectionHead eyebrow="Coming" title="On the way." lead="Same idea, same pricing. Not available yet — listed so you know where this is going." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP_APPS.map((r) => (
            <RoadmapCard key={r.slug} app={r} />
          ))}
        </div>
      </Section>
    </>
  );
}

function Expect({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-line pt-3 first:border-0 first:pt-0">
      <span className="text-fg-faint">{k}</span>
      <span className="text-fg-muted">{children}</span>
    </div>
  );
}
