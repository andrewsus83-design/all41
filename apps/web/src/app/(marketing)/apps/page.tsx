import type { Metadata } from "next";
import { RoadmapCard } from "@/components/marketing/app-card";
import { AppGallery } from "@/components/marketing/app-gallery";
import { Eyebrow, Lead, Section, SectionHead } from "@/components/marketing/primitives";
import { ROADMAP_APPS } from "@/content/apps";
import { toGalleryApp } from "@/content/gallery";
import { getPublishedApps } from "../_lib/data";

export const metadata: Metadata = {
  title: "Apps",
  description:
    "Ready-made tools — pick one, answer a few questions, see the price, run it. Briefing, SEO + GEO, proposals, research and more. Pay per run, no subscription.",
};

export default async function AppsPage() {
  const apps = await getPublishedApps();
  const gallery = apps.map(toGalleryApp);
  return (
    <>
      <Section className="pt-16 md:pt-24 pb-6">
        <div className="space-y-6 max-w-3xl mx-auto flex flex-col items-center text-center">
          <Eyebrow phase="green">Tools</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">Ready-made tools for real jobs.</h1>
          <Lead>
            Pick a tool, answer a few quick questions, see the price, then run it. The right AI does the work — pay only
            when you use.
          </Lead>
        </div>
      </Section>

      <Section className="pt-2">
        <AppGallery apps={gallery} filters />
      </Section>

      <Section>
        <SectionHead
          eyebrow="Coming"
          title="On the way."
          lead="Same idea, same pricing. Not available yet — listed so you know where this is going."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP_APPS.map((r) => (
            <RoadmapCard key={r.slug} app={r} />
          ))}
        </div>
      </Section>
    </>
  );
}
