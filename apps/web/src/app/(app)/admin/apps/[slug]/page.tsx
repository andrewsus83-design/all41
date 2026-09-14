import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { CREWS } from "@/lib/engine/crew";
import type { AppManifest } from "@/lib/engine/app-manifest";
import { AppEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function AppEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = adminClient();
  const { data: app } = await db.from("mini_apps").select("*").eq("slug", slug).maybeSingle();
  if (!app) notFound();
  const { data: versions } = await db.from("app_versions").select("version,changelog,created_at").eq("slug", slug).order("version", { ascending: false }).limit(30);

  const manifest: AppManifest = {
    slug: app.slug, name: app.name, description: app.description ?? "", category: app.category ?? "", icon: app.icon ?? "",
    who_for: app.who_for ?? "", tags: app.tags ?? [], autonomy_level: (app.autonomy_level as 1 | 2 | 3) ?? 1,
    brief_template: app.brief_template ?? "", config_schema: (app.config_schema as AppManifest["config_schema"]) ?? [],
    workflow_def: (app.workflow_def as AppManifest["workflow_def"]) ?? { steps: [] },
    est_credit_cost: Number(app.est_credit_cost) || 0, is_published: !!app.is_published, sort_order: Number(app.sort_order) || 100,
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/apps" className="text-sm text-fg-muted hover:text-fg">← All apps</Link>
      <AppEditor
        manifest={manifest}
        version={app.version ?? 1}
        knownCrews={Object.keys(CREWS)}
        versions={(versions ?? []).map((v) => ({ version: v.version, changelog: v.changelog, created_at: v.created_at }))}
      />
    </div>
  );
}
