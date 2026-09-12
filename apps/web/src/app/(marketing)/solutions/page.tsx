import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Eyebrow, H2, Lead, N, Section, SectionHead } from "@/components/marketing/primitives";
import { APP_META, PERSONAS } from "@/content/apps";
import { getPublishedApps } from "../_lib/data";

export const metadata: Metadata = {
  title: "Solutions",
  description: "Why all41 exists: one nice app needed a dozen tools and a dozen subscriptions. Now you describe the job and get back to the business.",
};

/** Illustrative "before" ledger — not a real bill. */
const LEDGER = [
  { name: "Chat AI", usd: 20, note: "used daily" },
  { name: "Second chat AI", usd: 20, note: "for when the first one was wrong" },
  { name: "Research AI", usd: 20, note: "opened twice a month" },
  { name: "Writing tool", usd: 49, note: "two seats, one person" },
  { name: "SEO suite", usd: 129, note: "one report a quarter" },
  { name: "Automation tool", usd: 30, note: "three flows, one still worked" },
  { name: "Email tool", usd: 13, note: "forgot the renewal" },
  { name: "Meeting notes", usd: 16, note: "never read them" },
];
const LEDGER_TOTAL = LEDGER.reduce((n, l) => n + l.usd, 0);

export default async function SolutionsPage() {
  const apps = await getPublishedApps();
  const bySlug = Object.fromEntries(apps.map((a) => [a.slug, a]));

  return (
    <>
      <Section className="pt-16 md:pt-24 pb-10">
        <div className="space-y-6 max-w-3xl">
          <Eyebrow phase="red">Why we built this</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">We were paying for plumbing.</h1>
          <Lead>A short story about how one nice app turned into a dozen subscriptions, and what we did about it.</Lead>
        </div>
      </Section>

      {/* STORY */}
      <Section className="pt-6">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] items-start">
          <div className="space-y-12">
            <Beat n="1" title="Each one started cheap.">
              To build one nice app we had to connect a dozen services and pay for a dozen platforms. Twenty dollars here, forty-nine there. None of them felt like a problem on its own.
            </Beat>
            <Beat n="2" title="Together they became expensive.">
              Renewals we forgot. Seats we did not use. Tools we opened twice a month. We never got close to using what we paid for, so the money was never well spent.
            </Beat>
            <Beat n="3" title="And none of it was the business.">
              Managing subscriptions is not work. Choosing which AI to use is not work. Learning how to phrase a prompt is not work. It was all plumbing, and it was eating the hours we had for the actual job.
            </Beat>
            <Beat n="4" title="So we made that part disappear.">
              all41 exists so the plumbing is ours. The connections are ours. Choosing the AI is ours. Pricing each task is ours. You describe the job and get back to the business.
            </Beat>
          </div>

          <Card className="space-y-5 lg:sticky lg:top-28">
            <div className="flex items-center justify-between gap-3">
              <p className="font-title text-lg">A month, before</p>
              <span className="text-xs uppercase tracking-[0.18em] text-amber">illustrative</span>
            </div>
            <ul className="divide-y divide-line">
              {LEDGER.map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p>{l.name}</p>
                    <p className="text-xs text-fg-faint">{l.note}</p>
                  </div>
                  <span className="num text-fg-muted">${l.usd}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-2">
              <p className="text-fg-muted">Per month</p>
              <p className="num text-3xl">${LEDGER_TOTAL}</p>
            </div>
            <p className="text-xs text-fg-faint">Made-up names and list prices, to show the shape of it. Your bill will look different. The pattern usually does not.</p>
          </Card>
        </div>
      </Section>

      {/* TWO AUDIENCES */}
      <Section>
        <SectionHead phase="amber" eyebrow="Who this is for" title="Two kinds of people land here." />
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-4 p-8">
            <CardTitle className="text-2xl">You have not started with AI.</CardTitle>
            <p className="text-fg-muted leading-relaxed">
              You do not have to learn it. Describe the job in plain words, like you would to a colleague. No prompts to learn, no AI to pick, no settings, no keys. You get the result and you see what it cost.
            </p>
          </Card>
          <Card className="space-y-4 p-8">
            <CardTitle className="text-2xl">You already use too many tools.</CardTitle>
            <p className="text-fg-muted leading-relaxed">
              You are tired of managing them and it is costing more than it should. Here it is one place, one balance, every task priced before it runs, and no subscriptions to babysit.
            </p>
          </Card>
        </div>
      </Section>

      {/* SEAMLESS */}
      <Section>
        <SectionHead phase="green" eyebrow="What seamless means here" title="Four things you will never do again." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Promise title="No keys, ever." body="You never sign up with an AI company or paste a key. That is our side." />
          <Promise title="No per-tool accounts." body="One login. The services behind each app are connected already." />
          <Promise title="One balance." body="Top up once. Every chat, app and scheduled run draws from the same place." />
          <Promise title="Priced before it runs." body="You see the cost of every task first. Nothing is charged for a run that fails." />
        </div>
      </Section>

      {/* PERSONAS */}
      <Section>
        <SectionHead phase="green" eyebrow="By role" title="The first job you would run." lead="And the two apps you would add next. Each one takes about twenty seconds to set up in chat." />
        <div className="grid gap-6 md:grid-cols-2">
          {PERSONAS.map((p) => (
            <Card key={p.id} className="space-y-6 p-7">
              <CardTitle className="text-2xl">{p.name}</CardTitle>
              <div className="squircle rounded-3 border border-line bg-bg p-4 space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-red">What</p>
                  <p>{p.briefing.what}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-red">Goal</p>
                  <p>{p.briefing.goal}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Then add</p>
                {p.apps.map((slug) => {
                  const a = bySlug[slug];
                  if (!a) return null;
                  return (
                    <div key={slug} className="flex items-center justify-between gap-4 py-2 border-t border-line">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl" aria-hidden>{a.icon ?? "◻"}</span>
                        <div className="min-w-0">
                          <p className="font-title font-medium">{a.name}</p>
                          <CardHint className="truncate">{APP_META[slug]?.pitch ?? a.description}</CardHint>
                        </div>
                      </div>
                      <Link href={`/my-apps/${slug}`} className="shrink-0">
                        <Button phase="green" size="sm">Set up · <Money usd={a.est_credit_cost} /></Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="pb-28">
        <div className="max-w-3xl space-y-8">
          <p className="reflect text-fg-muted text-2xl md:text-3xl">How many of the tools you pay for did you open this week?</p>
          <Link href="/login" className="inline-block"><Button phase="green" size="lg">Start with <N>$2</N> free</Button></Link>
        </div>
      </Section>
    </>
  );
}

function Beat({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-5">
      <span className="num text-fg-faint pt-1">{n}</span>
      <div className="space-y-2">
        <H2 className="text-2xl md:text-3xl">{title}</H2>
        <p className="text-fg-muted text-lg leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Promise({ title, body }: { title: string; body: string }) {
  return (
    <Card className="space-y-2">
      <CardTitle>{title}</CardTitle>
      <CardHint className="leading-relaxed">{body}</CardHint>
    </Card>
  );
}
