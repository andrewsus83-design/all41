import { notFound } from "next/navigation";
import { loadCatalog } from "../../build/catalog";
import { AppLanding } from "@/components/apps/app-landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  return { title: app ? app.name : "App" };
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = (await loadCatalog()).find((a) => a.slug === slug);
  if (!app) notFound();
  return <AppLanding app={app} />;
}
