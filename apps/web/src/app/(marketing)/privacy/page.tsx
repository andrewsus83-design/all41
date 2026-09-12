import type { Metadata } from "next";
import { Eyebrow, Lead, Section } from "@/components/marketing/primitives";
import { PRIVACY_LEAD, PRIVACY_TITLE, PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = { title: "Privacy", description: "Privacy notice placeholder for all41." };

export default function PrivacyPage() {
  return (
    <Section className="pt-16 md:pt-24 pb-28">
      <div className="max-w-2xl space-y-6">
        <Eyebrow>Privacy</Eyebrow>
        <h1 className="text-4xl md:text-5xl font-semibold">{PRIVACY_TITLE}</h1>
        <Lead>{PRIVACY_LEAD}</Lead>
        <PrivacyContent />
      </div>
    </Section>
  );
}
