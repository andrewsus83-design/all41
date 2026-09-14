"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/admin-audit";
import { CREWS } from "@/lib/engine/crew";
import { estimateInstanceCost } from "@/lib/engine/apps";
import { validateManifest, type AppManifest } from "@/lib/engine/app-manifest";
import type { Json } from "@/lib/supabase/database.types";

type R = { ok: boolean; message: string; extra?: unknown };
const knownCrews = () => Object.keys(CREWS);

/** The mini_apps columns the manifest owns. */
function rowFromManifest(m: AppManifest) {
  return {
    slug: m.slug, name: m.name, description: m.description ?? null, category: m.category ?? null, icon: m.icon ?? null,
    who_for: m.who_for ?? null, tags: Array.isArray(m.tags) ? m.tags : [], autonomy_level: Number(m.autonomy_level) || 1,
    brief_template: m.brief_template ?? null, config_schema: (m.config_schema ?? []) as unknown as Json,
    workflow_def: (m.workflow_def ?? { steps: [] }) as unknown as Json,
    est_credit_cost: Number(m.est_credit_cost) || 0, is_published: !!m.is_published, sort_order: Number(m.sort_order) || 100,
  };
}

/** Snapshot the CURRENT stored row into app_versions before we overwrite it. */
async function snapshot(slug: string, changelog: string, actorId: string) {
  const db = adminClient();
  const { data: cur } = await db.from("mini_apps").select("*").eq("slug", slug).maybeSingle();
  if (!cur) return null;
  await db.from("app_versions").insert({
    mini_app_id: cur.id, slug, version: cur.version ?? 1, manifest: cur as unknown as Json, changelog, created_by: actorId,
  });
  return cur;
}

export async function saveManifest(slug: string, manifest: AppManifest, changelog: string): Promise<R> {
  const user = await requireAdmin();
  const errors = validateManifest(manifest, knownCrews());
  if (errors.length) return { ok: false, message: "Validation failed", extra: errors };
  if (manifest.slug !== slug) return { ok: false, message: "slug cannot change on save (create a new app instead)." };

  const db = adminClient();
  const cur = await snapshot(slug, changelog || "manual save", user.id);
  if (!cur) return { ok: false, message: "app not found" };
  const nextVersion = (cur.version ?? 1) + 1;
  const { error } = await db.from("mini_apps").update({ ...rowFromManifest(manifest), version: nextVersion, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return { ok: false, message: error.message };
  await logAudit(user.id, "app.save", slug, { version: nextVersion, changelog });
  revalidatePath("/admin/apps"); revalidatePath(`/admin/apps/${slug}`);
  return { ok: true, message: `Saved as v${nextVersion}` };
}

export async function togglePublish(slug: string, publish: boolean): Promise<R> {
  const user = await requireAdmin();
  const { error } = await adminClient().from("mini_apps").update({ is_published: publish, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return { ok: false, message: error.message };
  await logAudit(user.id, publish ? "app.publish" : "app.unpublish", slug);
  revalidatePath("/admin/apps"); revalidatePath(`/admin/apps/${slug}`);
  return { ok: true, message: publish ? "Published" : "Unpublished" };
}

export async function rollbackApp(slug: string, toVersion: number): Promise<R> {
  const user = await requireAdmin();
  const db = adminClient();
  const { data: snap } = await db.from("app_versions").select("manifest,version").eq("slug", slug).eq("version", toVersion).maybeSingle();
  if (!snap) return { ok: false, message: `version ${toVersion} not found` };
  const cur = await snapshot(slug, `pre-rollback to v${toVersion}`, user.id);
  if (!cur) return { ok: false, message: "app not found" };
  const past = snap.manifest as unknown as Record<string, unknown>;
  const nextVersion = (cur.version ?? 1) + 1;
  const row = rowFromManifest({
    slug, name: String(past.name ?? cur.name), description: String(past.description ?? ""), category: String(past.category ?? ""),
    icon: String(past.icon ?? ""), who_for: String(past.who_for ?? ""), tags: (past.tags as string[]) ?? [], autonomy_level: (Number(past.autonomy_level) || 1) as 1 | 2 | 3,
    brief_template: String(past.brief_template ?? ""), config_schema: (past.config_schema as AppManifest["config_schema"]) ?? [],
    workflow_def: (past.workflow_def as AppManifest["workflow_def"]) ?? { steps: [] }, est_credit_cost: Number(past.est_credit_cost) || 0,
    is_published: !!past.is_published, sort_order: Number(past.sort_order) || 100,
  });
  const { error } = await db.from("mini_apps").update({ ...row, version: nextVersion, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return { ok: false, message: error.message };
  await logAudit(user.id, "app.rollback", slug, { toVersion, newVersion: nextVersion });
  revalidatePath("/admin/apps"); revalidatePath(`/admin/apps/${slug}`);
  return { ok: true, message: `Rolled back to v${toVersion} (now v${nextVersion})` };
}

export async function createApp(manifest: AppManifest): Promise<R> {
  const user = await requireAdmin();
  const errors = validateManifest(manifest, knownCrews());
  if (errors.length) return { ok: false, message: "Validation failed", extra: errors };
  const db = adminClient();
  const { data: exists } = await db.from("mini_apps").select("slug").eq("slug", manifest.slug).maybeSingle();
  if (exists) return { ok: false, message: `slug "${manifest.slug}" already exists — edit it instead.` };
  const { data, error } = await db.from("mini_apps").insert({ ...rowFromManifest(manifest), version: 1 }).select("id").single();
  if (error || !data) return { ok: false, message: error?.message ?? "insert failed" };
  await db.from("app_versions").insert({ mini_app_id: data.id, slug: manifest.slug, version: 1, manifest: manifest as unknown as Json, changelog: "created", created_by: user.id });
  await logAudit(user.id, "app.create", manifest.slug, { autonomy: manifest.autonomy_level });
  revalidatePath("/admin/apps");
  return { ok: true, message: `Created "${manifest.name}"` };
}

export async function importManifest(json: string): Promise<R> {
  await requireAdmin();
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, message: "Invalid JSON." }; }
  const m = parsed as AppManifest;
  const errors = validateManifest(m, knownCrews());
  if (errors.length) return { ok: false, message: "Validation failed", extra: errors };
  const { data: exists } = await adminClient().from("mini_apps").select("slug").eq("slug", m.slug).maybeSingle();
  return exists ? saveManifest(m.slug, m, "imported") : createApp(m);
}

/** Dry-run: validate + estimate one run's cost from the manifest (no run, no charge). */
export async function estimateApp(manifest: AppManifest): Promise<R> {
  await requireAdmin();
  const errors = validateManifest(manifest, knownCrews());
  if (errors.length) return { ok: false, message: "Validation failed", extra: errors };
  try {
    const est = await estimateInstanceCost({ config: {} as unknown as Json, workflow_def: manifest.workflow_def as unknown as Json });
    return { ok: true, message: `Estimated ${est.label} $${est.billedUsd.toFixed(4)} per run · ${est.steps.length} step(s)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
