import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Pipeline } from "@/components/marketing/pipeline";
import { JsonLd } from "@/components/marketing/json-ld";
import { Eyebrow, Lead, N, Section } from "@/components/marketing/primitives";
import { APP_META, SCHEMA_WORDS, type SampleOutput } from "@/content/apps";
import { getLeaders, getPublishedApp, lastLlmSchema, pipelineChips, scheduleOptions } from "../../_lib/data";

const SITE_URL = "https://all41.app";

/** Clean price for a title: "3", "0.60", "0.0050" — no trailing ".00". */
function priceLabel(n: number): string {
  if (n >= 1) return n.toFixed(2).replace(/\.00$/, "");
  if (n >= 0.01) return n.toFixed(2);
  return n.toFixed(4);
}

export async function generateMetadata(props: PageProps<"/apps/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const app = await getPublishedApp(slug);
  if (!app) return { title: "App not found" };
  const meta = APP_META[app.slug];
  const cost = priceLabel(app.est_credit_cost);
  const title = meta
    ? `${app.name} — instead of ${meta.replaces}. ~$${cost} per run, no subscription.`
    : `${app.name} — ~$${cost} per run, no subscription.`;
  const description = app.description
    ? `${app.description} Pay only when you use — the price is shown before every run.`
    : `A ready-made job you set up in chat. Pay only when you use — no subscription.`;
  return { title: { absolute: title }, description };
}

export default async function AppDetailPage(props: PageProps<"/apps/[slug]">) {
  const { slug } = await props.params;
  const [app, leaders] = await Promise.all([getPublishedApp(slug), getLeaders()]);
  if (!app) notFound();
  const meta = APP_META[app.slug];
  const schema = lastLlmSchema(app.steps);
  const cadence = scheduleOptions(app.questions);

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `all41 ${app.name}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: app.description ?? `${app.name} — a ready-made job you set up in chat, priced per run.`,
    offers: {
      "@type": "Offer",
      price: app.est_credit_cost.toFixed(2),
      priceCurrency: "USD",
      description: `Pay-per-use, ~$${priceLabel(app.est_credit_cost)} per run.`,
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Apps", item: `${SITE_URL}/apps` },
      { "@type": "ListItem", position: 2, name: app.name, item: `${SITE_URL}/apps/${app.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[softwareSchema, breadcrumbSchema]} />
      <Section className="pt-12 md:pt-20 pb-8">
        <Link href="/apps" className="text-sm text-fg-muted hover:text-fg">← All apps</Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-start">
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <span className="text-6xl" aria-hidden>{app.icon ?? "◻"}</span>
              <div className="space-y-2">
                <Eyebrow phase="green">App</Eyebrow>
                <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05]">{app.name}</h1>
              </div>
            </div>
            <Lead>{app.description}</Lead>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/my-apps/${app.slug}`}><Button phase="green" size="lg">Set it up in <N>20</N> seconds</Button></Link>
              <p className="text-fg-muted">≈ <Money usd={app.est_credit_cost} /> per run{meta ? <span className="text-fg-faint"> · instead of {meta.replaces}</span> : null}</p>
            </div>
          </div>
          <Card className="space-y-5">
            <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">How it works</p>
            <Pipeline chips={pipelineChips(app.steps, leaders)} />
            <div className="h-px bg-line" />
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[5.5rem_1fr] gap-3"><span className="text-fg-faint">You get</span><span className="text-fg-muted">{schema ? SCHEMA_WORDS[schema] : "a structured result with sources"}</span></div>
              <div className="grid grid-cols-[5.5rem_1fr] gap-3"><span className="text-fg-faint">Runs</span><span className="text-fg-muted">{cadence.length ? cadence.map((c) => c.toLowerCase()).join(" · ") : "once"}</span></div>
              <div className="grid grid-cols-[5.5rem_1fr] gap-3"><span className="text-fg-faint">Goes to</span><span className="text-fg-muted">chat · email · dashboard</span></div>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="pt-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] items-start">
          <div className="space-y-5">
            <h2 className="text-2xl md:text-3xl font-semibold">It asks you <N>{app.questions.length}</N> things.</h2>
            <p className="text-fg-muted">In chat, one at a time. Tap an option or type a few words.</p>
            <ol className="space-y-3">
              {app.questions.map((q, i) => (
                <li key={q.key} className="squircle rounded-3 border border-line bg-bg-elev p-4 space-y-2">
                  <p className="flex items-baseline gap-3"><span className="num text-fg-faint">{i + 1}</span><span className="font-title font-medium">{q.question}</span></p>
                  {q.options ? (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {q.options.map((o) => <span key={o} className="squircle rounded-1 border border-line px-2.5 py-1 text-xs text-fg-muted">{o}</span>)}
                    </div>
                  ) : q.placeholder ? (
                    <p className="pl-6 text-sm text-fg-faint">{q.placeholder}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl md:text-3xl font-semibold">What a result looks like</h2>
              <Badge tone="amber">sample</Badge>
            </div>
            <p className="text-fg-muted">A made-up example in the exact shape you will get. Real runs cite real sources.</p>
            {meta ? <SampleView sample={meta.sample} /> : <Card><CardHint>No sample yet for this app.</CardHint></Card>}
          </div>
        </div>
      </Section>

      <Section className="pb-28">
        <div className="squircle rounded-6 border border-line bg-bg-elev p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Ready when you are.</CardTitle>
            <CardHint className="text-base">Answer the questions above in chat. First run is priced before it starts.</CardHint>
          </div>
          <Link href={`/my-apps/${app.slug}`}><Button phase="green" size="lg">Set it up in <N>20</N> seconds</Button></Link>
        </div>
      </Section>
    </>
  );
}

function Sources({ sources }: { sources: { ref: string; quote: string }[] }) {
  return (
    <div className="space-y-1.5 pt-3 border-t border-line">
      <p className="text-[11px] uppercase tracking-wider text-fg-faint">Sources</p>
      {sources.map((s) => (
        <p key={s.ref} className="text-xs text-fg-muted"><span className="font-mono text-fg-faint mr-2">{s.ref}</span>“{s.quote}”</p>
      ))}
    </div>
  );
}

function SampleView({ sample }: { sample: SampleOutput }) {
  if (sample.schema === "briefing") {
    return (
      <Card className="space-y-5">
        <CardTitle className="text-xl">{sample.title}</CardTitle>
        <ol className="space-y-4">
          {sample.items.map((it, i) => (
            <li key={i} className="space-y-1">
              <p className="font-medium">{it.headline}</p>
              <p className="text-sm text-fg-muted"><span className="text-amber">Why it matters ·</span> {it.why_it_matters}</p>
              <p className="text-sm text-fg-muted"><span className="text-green">Do ·</span> {it.action}</p>
            </li>
          ))}
        </ol>
        <Sources sources={sample.sources} />
      </Card>
    );
  }
  if (sample.schema === "report") {
    return (
      <Card className="space-y-5">
        <CardTitle className="text-xl">{sample.title}</CardTitle>
        <p className="text-fg-muted">{sample.summary}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-fg-faint">
              <tr className="border-b border-line"><th className="text-left py-2 pr-3 font-medium">Dimension</th><th className="text-left py-2 pr-3 font-medium">Them</th><th className="text-left py-2 font-medium">You</th></tr>
            </thead>
            <tbody>
              {sample.table.map((r) => (
                <tr key={r.dimension} className="border-b border-line last:border-0"><td className="py-2 pr-3 text-fg-muted">{r.dimension}</td><td className="py-2 pr-3">{r.them}</td><td className="py-2">{r.you}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1"><p className="text-red text-xs uppercase tracking-wider">Threats</p>{sample.threats.map((t) => <p key={t} className="text-fg-muted">· {t}</p>)}</div>
          <div className="space-y-1"><p className="text-green text-xs uppercase tracking-wider">Opportunities</p>{sample.opportunities.map((t) => <p key={t} className="text-fg-muted">· {t}</p>)}</div>
        </div>
        <p className="text-sm"><span className="text-amber">Next move ·</span> {sample.next_move}</p>
        <Sources sources={sample.sources} />
      </Card>
    );
  }
  return (
    <Card className="space-y-5">
      <CardTitle className="text-xl">{sample.title}</CardTitle>
      <div className="space-y-4">
        {sample.drafts.map((d) => (
          <div key={d.platform} className="squircle rounded-3 border border-line bg-bg p-4 space-y-2">
            <Badge tone="neutral">{d.platform}</Badge>
            <p className="font-medium">{d.hook}</p>
            <p className="text-sm text-fg-muted">{d.body}</p>
            <p className="text-sm text-green">{d.cta}</p>
          </div>
        ))}
      </div>
      <Sources sources={sample.sources} />
    </Card>
  );
}
