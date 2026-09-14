import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getBalance } from "@/lib/finance";
import { loadCatalog } from "../../../build/catalog";
import { WebBuilderStudio } from "@/components/apps/web-builder-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create your website — all41" };

export default async function WebBuilderCreatePage() {
  const { user } = await requireUser();
  const [apps, balance] = await Promise.all([loadCatalog(), getBalance(user.id).catch(() => 0)]);
  const app = apps.find((a) => a.slug === "web-builder");
  if (!app) notFound();
  return <WebBuilderStudio app={app} balance={balance} />;
}
