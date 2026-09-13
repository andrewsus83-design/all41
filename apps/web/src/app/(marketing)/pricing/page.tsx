import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { PricingCalculator } from "@/components/marketing/pricing-calculator";
import { Eyebrow, H2, Lead, N, Section, SectionHead } from "@/components/marketing/primitives";
import { FREE_CREDIT_USD, TASK_PRICE_USD, TOP_UP_AMOUNTS_USD } from "@/content/sprawl";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Top up. Pay per task. That's it. $2 free to start, no subscription, plain dollars, credits last 12 months, price shown before every run.",
};

export default function PricingPage() {
  return (
    <>
      <Section className="pt-16 md:pt-24 pb-12">
        <div className="space-y-8 max-w-3xl mx-auto flex flex-col items-center text-center">
          <Eyebrow phase="green">Pricing</Eyebrow>
          <h1 className="text-5xl md:text-7xl font-semibold leading-[1.02]">Top up. Pay per task. That&apos;s it.</h1>
          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-3 text-lg text-fg-muted">
            <li>· <N>${FREE_CREDIT_USD}</N> free to start</li>
            <li>· No subscription</li>
            <li>· Plain dollars, never points</li>
            <li>· Credits last <N>12</N> months</li>
            <li className="sm:col-span-2">· Price = the real AI cost × a fixed mark-up, shown before every run</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-fg-faint">Top-up amounts</span>
            {TOP_UP_AMOUNTS_USD.map((a) => (
              <span key={a} className="squircle rounded-2 border border-line bg-bg-elev px-4 py-2 num">${a}</span>
            ))}
          </div>
        </div>
      </Section>

      <Section className="pt-4">
        <SectionHead phase="amber" eyebrow="Work out your number" title="Your stack today, versus per task." lead={<>Most tasks land between <Money usd={TASK_PRICE_USD.light} /> and <Money usd={TASK_PRICE_USD.heavy} />. This is an estimate — the exact price is shown before every run.</>} />
        <PricingCalculator />
      </Section>

      <Section className="pb-28">
        <div className="max-w-2xl space-y-6">
          <H2>No plan to pick. No tier to outgrow.</H2>
          <Lead>Top up when you need to. Every chat, app and scheduled run draws from the same balance. A failed run costs nothing.</Lead>
          <Link href="/login" className="inline-block"><Button phase="green" size="lg">Start with <N>${FREE_CREDIT_USD}</N> free</Button></Link>
        </div>
      </Section>
    </>
  );
}
