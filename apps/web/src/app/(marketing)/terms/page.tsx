import type { Metadata } from "next";
import { Eyebrow, Lead, Section } from "@/components/marketing/primitives";
import { TERMS_LEAD, TERMS_TITLE, TermsContent } from "@/components/legal/terms-content";

export const metadata: Metadata = { title: "Terms", description: "Terms of service placeholder for all41." };

export default function TermsPage() {
  return (
    <Section className="pt-16 md:pt-24 pb-28">
      <div className="max-w-2xl space-y-6">
        <Eyebrow>Terms</Eyebrow>
        <h1 className="text-4xl md:text-5xl font-semibold">{TERMS_TITLE}</h1>
        <Lead>{TERMS_LEAD}</Lead>
        <TermsContent />
      </div>
    </Section>
  );
}
