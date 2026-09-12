import type { Metadata } from "next";
import { Eyebrow, Lead, Section } from "@/components/marketing/primitives";

export const metadata: Metadata = { title: "Privacy", description: "Privacy notice placeholder for all41." };

export default function PrivacyPage() {
  return (
    <Section className="pt-16 md:pt-24 pb-28">
      <div className="max-w-2xl space-y-6">
        <Eyebrow>Privacy</Eyebrow>
        <h1 className="text-4xl md:text-5xl font-semibold">Privacy notice</h1>
        <Lead>This is a placeholder. The full notice is being written and will replace this page before public launch.</Lead>
        <div className="space-y-3 text-fg-muted leading-relaxed">
          <p>What we can already say plainly: your files, tasks and notes belong to your account and are used to answer your own questions only. We do not sell data. Keys for the AI services are ours and are never shown to you or stored in your account.</p>
          <p>Questions in the meantime: reply to any email from us.</p>
        </div>
      </div>
    </Section>
  );
}
