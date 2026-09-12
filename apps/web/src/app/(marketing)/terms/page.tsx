import type { Metadata } from "next";
import { Eyebrow, Lead, Section } from "@/components/marketing/primitives";

export const metadata: Metadata = { title: "Terms", description: "Terms of service placeholder for all41." };

export default function TermsPage() {
  return (
    <Section className="pt-16 md:pt-24 pb-28">
      <div className="max-w-2xl space-y-6">
        <Eyebrow>Terms</Eyebrow>
        <h1 className="text-4xl md:text-5xl font-semibold">Terms of service</h1>
        <Lead>This is a placeholder. The full terms are being written and will replace this page before public launch.</Lead>
        <div className="space-y-3 text-fg-muted leading-relaxed">
          <p>What we can already say plainly: you pay per task, the price is shown before a run, failed runs are not charged, and unused top-up credit can be refunded on request. Credits expire after twelve months.</p>
        </div>
      </div>
    </Section>
  );
}
