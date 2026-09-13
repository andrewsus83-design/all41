import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { JsonLd } from "@/components/marketing/json-ld";
import { Eyebrow, Lead, N, Section } from "@/components/marketing/primitives";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = {
  title: "FAQ — plain answers about the AI, the cost, and your data",
  description: "Straight answers: which AI does the work, what a task costs, where your data lives, whether credits expire, and why it's cheaper than your subscriptions.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <Section className="pt-16 md:pt-24 pb-10">
        <div className="space-y-6 max-w-3xl mx-auto flex flex-col items-center text-center">
          <Eyebrow>Questions</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">Straight answers.</h1>
          <Lead>If something is not here, the Resources page has the updates and the full list of what we use.</Lead>
        </div>
      </Section>
      <Section className="pt-4">
        <FaqAccordion items={FAQ} />
      </Section>
      <Section className="pb-28 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-fg-muted">Still unsure? Run one small job and look at the price.</p>
          <Link href="/login" className="inline-block"><Button phase="green">Start with <N>$2</N> free</Button></Link>
        </div>
      </Section>
    </>
  );
}
