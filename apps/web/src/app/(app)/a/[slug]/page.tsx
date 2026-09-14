import { notFound } from "next/navigation";
import { loadCatalog } from "../../build/catalog";
import { AppLanding } from "@/components/apps/app-landing";
import { WebBuilderLanding } from "@/components/apps/web-builder-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  if (!app) return { title: "App" };
  const description = app.description?.slice(0, 155);
  return {
    title: `${app.name} — all41`,
    description,
    alternates: { canonical: `/a/${app.slug}` },
    openGraph: { title: app.name, description, type: "website", url: `/a/${app.slug}` },
    twitter: { card: "summary_large_image", title: app.name, description },
  };
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  if (!app) notFound();
  if (app.slug === "web-builder") return <WebBuilderLanding app={app} />;
  return <AppLanding app={app} />;
}
