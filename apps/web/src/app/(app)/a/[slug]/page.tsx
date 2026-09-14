import { notFound } from "next/navigation";
import { loadCatalog } from "../../build/catalog";
import { AppDeck } from "@/components/apps/app-deck";
import { APP_DECK } from "@/content/app-deck-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  if (!app) return { title: "App" };
  const page = APP_DECK[slug];
  const description = page?.geoSummary ?? app.description?.slice(0, 160);
  return {
    title: `${app.name} — all41`,
    description,
    keywords: page?.keywords,
    alternates: { canonical: `/a/${app.slug}` },
    openGraph: { title: app.name, description, type: "website", url: `/a/${app.slug}` },
    twitter: { card: "summary_large_image", title: app.name, description },
  };
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  if (!app) notFound();
  return <AppDeck app={app} />;
}
