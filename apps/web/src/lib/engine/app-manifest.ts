/**
 * App Manifest — the portable, versioned definition of an all41 mini-app.
 * Pure/isomorphic (no server imports) so the admin editor can validate inline and
 * the server actions can validate before writing. The manifest IS the mini_apps row's
 * authoring surface; crews (Level-3) reference code by `crew_id`, everything else is data.
 */
export type ConfigQuestion = {
  key: string;
  question: string;
  type: "text" | "choice" | "multi";
  options?: string[];
  placeholder?: string;
};

export type WorkflowStep = {
  id: string;
  kind: "search" | "crawl" | "llm" | "agent" | "crew";
  task_type?: string;
  schema?: string;
  prompt?: string;
  crew_id?: string;
  goal?: string;
  when?: string;
  [k: string]: unknown;
};

export type AppManifest = {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  who_for: string;
  tags: string[];
  autonomy_level: 1 | 2 | 3;
  brief_template: string;
  config_schema: ConfigQuestion[];
  workflow_def: { steps: WorkflowStep[] };
  est_credit_cost: number;
  is_published: boolean;
  sort_order: number;
};

export const MANIFEST_VERSION = 1;
const STEP_KINDS = ["search", "crawl", "llm", "agent", "crew"] as const;
const QUESTION_TYPES = ["text", "choice", "multi"] as const;

/** Which crews the manifest depends on (code-backed). Empty ⇒ a pure data-only app. */
export function crewIdsOf(m: Pick<AppManifest, "workflow_def">): string[] {
  const steps = m.workflow_def?.steps ?? [];
  return [...new Set(steps.filter((s) => s.kind === "crew" && s.crew_id).map((s) => String(s.crew_id)))];
}
export function isCrewBacked(m: Pick<AppManifest, "workflow_def">): boolean {
  return crewIdsOf(m).length > 0;
}

/** Validate a manifest. Returns human-readable errors (empty ⇒ valid). knownCrews limits crew_id to registered crews when provided. */
export function validateManifest(input: unknown, knownCrews?: string[]): string[] {
  const e: string[] = [];
  if (!input || typeof input !== "object") return ["Manifest must be an object."];
  const m = input as Partial<AppManifest>;

  if (!m.slug || !/^[a-z0-9-]+$/.test(m.slug)) e.push("slug: lowercase letters, numbers and dashes only.");
  if (!m.name || !String(m.name).trim()) e.push("name: required.");
  if (m.autonomy_level !== undefined && ![1, 2, 3].includes(Number(m.autonomy_level))) e.push("autonomy_level: must be 1, 2 or 3.");
  if (m.est_credit_cost !== undefined && (!Number.isFinite(Number(m.est_credit_cost)) || Number(m.est_credit_cost) < 0)) e.push("est_credit_cost: must be a number ≥ 0.");
  if (m.sort_order !== undefined && !Number.isInteger(Number(m.sort_order))) e.push("sort_order: must be an integer.");
  if (m.tags !== undefined && !Array.isArray(m.tags)) e.push("tags: must be an array of strings.");

  // config_schema
  if (m.config_schema !== undefined) {
    if (!Array.isArray(m.config_schema)) e.push("config_schema: must be an array.");
    else {
      const seen = new Set<string>();
      m.config_schema.forEach((q, i) => {
        if (!q || typeof q !== "object") { e.push(`config_schema[${i}]: must be an object.`); return; }
        if (!q.key || !/^[a-z0-9_]+$/.test(q.key)) e.push(`config_schema[${i}].key: lowercase/_ only.`);
        else if (seen.has(q.key)) e.push(`config_schema[${i}].key "${q.key}": duplicate.`); else seen.add(q.key);
        if (!q.question || !String(q.question).trim()) e.push(`config_schema[${i}].question: required.`);
        if (!q.type || !(QUESTION_TYPES as readonly string[]).includes(q.type)) e.push(`config_schema[${i}].type: one of ${QUESTION_TYPES.join(", ")}.`);
        if ((q.type === "choice" || q.type === "multi") && (!Array.isArray(q.options) || q.options.length === 0)) e.push(`config_schema[${i}].options: required for ${q.type}.`);
      });
    }
  }

  // workflow_def
  const steps = m.workflow_def?.steps;
  if (!m.workflow_def || typeof m.workflow_def !== "object" || !Array.isArray(steps)) {
    e.push("workflow_def: must be an object with a non-empty `steps` array.");
  } else if (steps.length === 0) {
    e.push("workflow_def.steps: at least one step required.");
  } else {
    const ids = new Set<string>();
    steps.forEach((s, i) => {
      if (!s || typeof s !== "object") { e.push(`workflow_def.steps[${i}]: must be an object.`); return; }
      if (!s.id) e.push(`workflow_def.steps[${i}].id: required.`);
      else if (ids.has(s.id)) e.push(`workflow_def.steps[${i}].id "${s.id}": duplicate.`); else ids.add(s.id);
      if (!s.kind || !(STEP_KINDS as readonly string[]).includes(s.kind)) e.push(`workflow_def.steps[${i}].kind: one of ${STEP_KINDS.join(", ")}.`);
      if (s.kind === "llm" && !s.prompt) e.push(`workflow_def.steps[${i}] (llm): needs a prompt.`);
      if (s.kind === "agent" && !s.goal) e.push(`workflow_def.steps[${i}] (agent): needs a goal.`);
      if (s.kind === "crew") {
        if (!s.crew_id) e.push(`workflow_def.steps[${i}] (crew): needs a crew_id.`);
        else if (knownCrews && knownCrews.length && !knownCrews.includes(String(s.crew_id))) e.push(`workflow_def.steps[${i}].crew_id "${s.crew_id}": not a registered crew (${knownCrews.join(", ")}). It needs code shipped in crew.ts.`);
        if (!s.schema) e.push(`workflow_def.steps[${i}] (crew): needs an output schema.`);
      }
    });
  }
  return e;
}
