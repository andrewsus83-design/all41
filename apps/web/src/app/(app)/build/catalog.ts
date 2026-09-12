import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { describeWorkflow, type WorkflowDef } from "@/lib/engine/apps";
import type { CatalogApp, ConfigQuestion } from "@/components/apps/types";

/** Every app all41 offers (published catalog + the always-available "custom" template, shown first). */
export async function loadCatalog(): Promise<CatalogApp[]> {
  const { data } = await adminClient().from("mini_apps").select("slug, name, description, icon, category, tags, brief_template, who_for, config_schema, workflow_def, est_credit_cost, is_published").order("sort_order");
  const rows = (data ?? []).filter((a) => a.is_published || a.slug === "custom");
  const toApp = (a: (typeof rows)[number]): CatalogApp => {
    const def = a.workflow_def as unknown as WorkflowDef;
    const steps = describeWorkflow(def);
    return {
      slug: a.slug, name: a.name, description: a.description ?? "", icon: a.icon ?? "◻", category: a.category, tags: a.tags ?? [],
      briefTemplate: a.brief_template ?? null, whoFor: a.who_for ?? null, isCustom: a.slug === "custom",
      estCostUsd: Number(a.est_credit_cost), questions: (Array.isArray(a.config_schema) ? a.config_schema : []) as ConfigQuestion[],
      steps, hasFreshToggle: steps.some((s) => s.when?.startsWith("needs_fresh=")),
    };
  };
  const custom = rows.filter((a) => a.slug === "custom").map(toApp);
  const rest = rows.filter((a) => a.slug !== "custom").map(toApp);
  return [...custom, ...rest];
}

