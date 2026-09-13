import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { LiveBriefingDemo } from "@/components/marketing/live-briefing-demo";
import { GraphIllustration } from "@/components/marketing/graph-illustration";
import { AppCard } from "@/components/marketing/app-card";
import { Eyebrow, H2, N, Section, SectionHead, TextLink } from "@/components/marketing/primitives";
import { SPRAWL_TOOLS, SPRAWL_TOTAL_USD, TASK_PRICE_USD, FREE_CREDIT_USD } from "@/content/sprawl";
import { APP_META } from "@/content/apps";
import { FAQ } from "@/content/faq";
import { getLatestBenchmarks, getPublishedApps, getRoutingWeights, taskLabel } from "./_lib/data";

export const metadata: Metadata = {
  title: { absolute: "all41 — Tell us the job. We'll handle the AI." },
  description: "No prompts to learn. No tools to juggle. Describe the job in plain words; all41 picks the right AI, does the work, and shows the price before it runs. Start with $2 free.",
};

const HOME_FAQ_IDS = ["learn", "api-keys", "cost", "expire"];

export default async function HomePage() {
  const [apps, bench, weights] = await Promise.all([getPublishedApps(), getLatestBenchmarks(), getRoutingWeights()]);
  const real = bench.rows.length > 0 && !bench.isMock;
  const leaderRows = real ? bench.rows.filter((r) => r.is_leader) : [];
  const weightLeaders = weights.filter((w) => w.is_leader);

  return (
    <>
      {/* HERO — centered, cinematic */}
      <Section className="pt-20 md:pt-28 pb-16 md:pb-24">
        <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
          <div className="rise"><Eyebrow phase="green">One chat. Done.</Eyebrow></div>
          <h1 className="rise-1 text-6xl md:text-7xl xl:text-8xl font-semibold leading-[1.0] tracking-tight text-balance">
            Tell us the job.
            <br />
            We&apos;ll handle <span className="text-grad">the AI.</span>
          </h1>
          <p className="rise-2 text-lg md:text-2xl text-fg-muted max-w-2xl leading-relaxed text-pretty">
            No prompts to learn. No tools to juggle. Describe what you need in plain words. all41 picks the right AI, does the work, and shows you the price before it runs.
          </p>
          <div className="rise-3 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button phase="warm" size="lg" className="w-full sm:w-auto glow-coral sheen">Start with <N>${FREE_CREDIT_USD}</N> free</Button>
            </Link>
            <a href="#routing">
              <Button phase="ghost" size="lg" className="w-full sm:w-auto">See how it picks</Button>
            </a>
          </div>
          <p className="rise-4 reflect text-fg-muted">Other AI tools let you be lazy. all41 makes you sharp.</p>
        </div>
        {/* live demo, centered in a premium glass frame */}
        <div className="rise-2 relative mx-auto mt-16 md:mt-20 w-full max-w-xl">
          <div className="absolute -inset-10 -z-10 glow-soft rounded-6" aria-hidden />
          <div className="grad-ring rounded-5 lift">
            <LiveBriefingDemo />
          </div>
        </div>
      </Section>

      <Divider />

      {/* TWO AUDIENCES */}
      <Section className="pt-8">
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Card className="flex flex-col items-center text-center space-y-4 p-8 glass grad-ring lift">
            <Eyebrow phase="amber">New to AI?</Eyebrow>
            <CardTitle className="text-2xl">You don&apos;t have to learn it.</CardTitle>
            <p className="text-fg-muted leading-relaxed max-w-sm">
              Say what you need the way you would to a colleague. No prompts to master, no AI to choose, no settings, no keys. You get the result and the price.
            </p>
          </Card>
          <Card className="flex flex-col items-center text-center space-y-4 p-8 glass grad-ring lift">
            <Eyebrow phase="amber">Tired of juggling tools?</Eyebrow>
            <CardTitle className="text-2xl">One place. One balance.</CardTitle>
            <p className="text-fg-muted leading-relaxed max-w-sm">
              No subscriptions to babysit, no seats you forgot about. Every task is priced before it runs, and you only pay for what actually ran.
            </p>
          </Card>
        </div>
      </Section>

      {/* CYCLE */}
      <Section>
        <SectionHead phase="red" eyebrow="How a job moves" title="Stop & Think · Prepare · Go & Track" lead="Every job goes through the same three lights. It takes about twenty seconds and it is why the results are good." />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { tone: "red" as const, label: "Stop & Think", title: "What, and why.", body: "Two short questions: what do you need, and what will you decide with it. Clear in, clear out." },
            { tone: "amber" as const, label: "Prepare", title: "Set the conditions.", body: "How fresh, what tone, what shape. Tap a few options. all41 pulls in your own files and notes where they help." },
            { tone: "green" as const, label: "Go & Track", title: "Run it. Keep it.", body: "See the price, run it, get the result. Run it once, on a schedule, or save it as an app you tap next time." },
          ].map((c) => (
            <Card key={c.label} className="flex flex-col items-center text-center space-y-4 lift">
              <Badge tone={c.tone}>{c.label}</Badge>
              <CardTitle className="text-2xl">{c.title}</CardTitle>
              <CardHint className="leading-relaxed">{c.body}</CardHint>
            </Card>
          ))}
        </div>
        <p className="reflect text-fg-muted mt-12 text-center">Other AI tools let you be lazy. all41 makes you sharp.</p>
      </Section>

      {/* SPRAWL */}
      <Section>
        <SectionHead phase="amber" eyebrow="One chat replaces the stack" title="Stop paying for eight things you open twice a month." lead="A typical solo stack, at list price. You use a slice of each. all41 charges per task instead, so the bill follows the work." />
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] items-start max-w-4xl mx-auto">
          <ul className="grid sm:grid-cols-2 gap-2">
            {SPRAWL_TOOLS.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-full border border-line bg-bg-elev px-4 py-3">
                <span>{t.name}</span>
                <span className="num text-fg-muted">${t.monthlyUsd}<span className="text-fg-faint">/mo</span></span>
              </li>
            ))}
          </ul>
          <Card className="text-center space-y-6 lg:w-80 glass grad-ring">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Those eight, per month</p>
              <p className="num text-5xl text-grad">${SPRAWL_TOTAL_USD}</p>
              <p className="text-xs text-fg-faint">List prices, illustrative.</p>
            </div>
            <div className="h-px bg-line" />
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-green">all41</p>
              <p className="text-2xl font-title">Pay per task</p>
              <p className="text-fg-muted">
                Typically <Money usd={TASK_PRICE_USD.light} /> – <Money usd={TASK_PRICE_USD.heavy} /> per task
              </p>
            </div>
            <div className="flex justify-center"><TextLink href="/pricing">Work out your number</TextLink></div>
          </Card>
        </div>
      </Section>

      {/* APPS */}
      <Section>
        <SectionHead phase="green" eyebrow="Apps" title="Ready-made jobs. Fill in the blanks." lead="Pick one, answer three or four questions in chat, and it runs — once or on a schedule. Nothing to build." />
        {apps.length === 0 ? (
          <p className="text-fg-faint text-center">No apps published yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {apps.map((a) => (
              <AppCard key={a.id} app={a} replaces={APP_META[a.slug]?.replaces} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <TextLink href="/apps">All apps, and what is coming</TextLink>
        </div>
      </Section>

      {/* ROUTING */}
      <Section id="routing">
        <SectionHead phase="green" eyebrow="Picks the right AI for the job" title="We test the AIs every day so you don't have to." lead="The best AI for research is not the best one for writing, and it changes. Each kind of job goes to whichever did best in today's test. You never choose." />
        <div className="max-w-3xl mx-auto rounded-5 border border-line bg-bg-elev glass overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-fg-faint">
              <tr className="border-b border-line">
                <th className="px-5 py-4 font-medium">Kind of job</th>
                <th className="px-5 py-4 font-medium">Today&apos;s pick</th>
                <th className="px-5 py-4 font-medium text-right">Typical cost per run</th>
              </tr>
            </thead>
            <tbody>
              {real
                ? leaderRows.map((r) => (
                    <tr key={r.task_type} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">{taskLabel(r.task_type)}</td>
                      <td className="px-5 py-4 text-green">
                        Tested today <span className="num text-fg-faint ml-2">score {r.score.toFixed(1)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">{r.cost_per_run !== null ? <Money usd={r.cost_per_run} /> : <span className="text-fg-faint">—</span>}</td>
                    </tr>
                  ))
                : weightLeaders.map((w) => (
                    <tr key={w.task_type} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">{taskLabel(w.task_type)}</td>
                      <td className="px-5 py-4 text-fg-muted">Starting pick</td>
                      <td className="px-5 py-4 text-right text-fg-faint">—</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-line flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
            <span>{real ? <>Last test: <N>{bench.date}</N></> : "First real test runs tonight. Until then, our starting picks apply."}</span>
            <TextLink href="/resources">See today&apos;s results</TextLink>
          </div>
        </div>
      </Section>

      {/* GRAPH — centered */}
      <Section>
        <SectionHead phase="amber" eyebrow="Your own files and notes" title="Answers from your world, with sources." lead="Files you add, results you have run, and notes you keep get linked together. When you ask something, all41 pulls in what is connected and shows where each claim came from. For important jobs it checks the answer against the sources a second time." />
        <div className="max-w-2xl mx-auto rounded-5 border border-line bg-bg-elev glass grad-ring p-6">
          <GraphIllustration className="w-full h-auto" />
          <p className="text-xs text-fg-faint mt-2 text-center">Solid lines: links you made. Dashed: links all41 found.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-fg-muted mt-8 text-sm">
          <span>· Add a file once, it helps every later job.</span>
          <span>· Every answer says what it used.</span>
          <span>· Your data is used for your questions only.</span>
        </div>
      </Section>

      {/* MONEY — centered */}
      <Section>
        <SectionHead phase="green" eyebrow="Every cent tracked" title="You see the price. Then it runs." lead={<>Your balance is checked before anything starts. The cost is written down before the result comes back. Plain dollars, never points. Credits last <N>12</N> months.</>} />
        <Card className="max-w-md mx-auto space-y-4 font-mono text-sm glass grad-ring">
          <p className="text-xs uppercase tracking-[0.18em] text-fg-faint font-sans text-center">Example task line · illustrative</p>
          <div className="space-y-2 num">
            <Row k="task" v="compare pricing · Jasper vs Pro" />
            <Row k="balance before" v="$2.0000" />
            <Row k="priced at" v="$0.0312" />
            <Row k="charged" v="$0.0298" green />
            <Row k="balance after" v="$1.9702" />
          </div>
        </Card>
      </Section>

      {/* PRICING TEASER */}
      <Section>
        <div className="rounded-6 glass grad-ring glow-soft p-10 md:p-16 flex flex-col items-center text-center gap-5 max-w-3xl mx-auto">
          <Eyebrow phase="green">Pricing</Eyebrow>
          <H2>Top up. Pay per task. That&apos;s it.</H2>
          <p className="text-fg-muted text-lg">
            <N>${FREE_CREDIT_USD}</N> free to start · no subscription · most tasks <Money usd={TASK_PRICE_USD.light} />–<Money usd={TASK_PRICE_USD.heavy} />
          </p>
          <Link href="/pricing"><Button phase="soft" size="lg">See pricing</Button></Link>
        </div>
      </Section>

      {/* FAQ TEASER */}
      <Section>
        <SectionHead eyebrow="Questions" title="Straight answers." />
        <dl className="grid gap-x-12 gap-y-8 md:grid-cols-2 max-w-4xl mx-auto text-center md:text-left">
          {FAQ.filter((f) => HOME_FAQ_IDS.includes(f.id)).map((f) => (
            <div key={f.id} className="space-y-2">
              <dt className="font-title text-lg font-semibold text-fg">{f.q}</dt>
              <dd className="text-fg-muted leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 text-center"><TextLink href="/faq">All questions</TextLink></div>
      </Section>

      {/* FINAL CTA */}
      <Section className="pb-28">
        <div className="relative rounded-6 glass grad-ring p-12 md:p-20 text-center space-y-6 max-w-3xl mx-auto overflow-hidden">
          <div className="absolute inset-0 -z-10 grad-soft opacity-60" aria-hidden />
          <H2 className="text-4xl md:text-6xl">Describe one job. See what comes back.</H2>
          <p className="text-fg-muted text-lg">No card. No setup. <N>${FREE_CREDIT_USD}</N> to spend on real work.</p>
          <Link href="/login" className="inline-block"><Button phase="warm" size="lg" className="glow-coral sheen">Start with <N>${FREE_CREDIT_USD}</N> free</Button></Link>
        </div>
      </Section>
    </>
  );
}

function Divider() {
  return <div className="mx-auto max-w-6xl px-6"><div className="h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" /></div>;
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line last:border-0 py-1.5">
      <span className="text-fg-faint font-sans">{k}</span>
      <span className={green ? "text-green" : "text-fg"}>{v}</span>
    </div>
  );
}
