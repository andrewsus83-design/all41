/** Who each app is for — plain words, shown in the Build modal. Falls back to a generic line. */
export const WHO_FOR: Record<string, string> = {
  "morning-briefing": "Anyone who needs to know what changed overnight in their niche — before the first coffee.",
  "competitor-crawler": "Founders and marketers who want to see a rival's pricing and features side by side with their own.",
  "content-pipeline": "People who post regularly and want one idea turned into ready drafts for each platform, in their own voice.",
  custom: "Anyone with a job they'd explain to a smart assistant in two sentences — and want done on repeat.",
};

export function whoFor(slug: string, fromDb?: string | null) {
  return fromDb?.trim() || WHO_FOR[slug] || "Anyone who wants this done for them on a schedule, without babysitting it.";
}

export const CATEGORY_LABELS: Record<string, string> = {
  research: "Research", content: "Content", sales: "Sales", marketing: "Marketing", ops: "Operations", finance: "Finance", custom: "From scratch",
};
export function categoryLabel(c: string | null | undefined) {
  if (!c) return "Other";
  return CATEGORY_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1);
}

// ---- autonomy level (docs/APP_AUTONOMY_GUIDE.md) — the user never sees "levels", only what it means for them ----

export type AutonomyLevel = 1 | 2 | 3;

/** Templates the guide classes as branching (Level 2) even though their workflow shape looks fixed — mirrors the migration. */
export const LEVEL_2_SLUGS = new Set(["morning-briefing", "content-pipeline", "email-campaign", "crm-lite", "invoice-tracker", "social-monitor"]);

type StepShape = { kind: string; when?: string | null; maxSteps?: number; ceilingUsd?: number; verify?: boolean };

/** Same rule as the DB column: an agent step → 3; any conditional step, two-plus thinking steps, or a listed slug → 2; else 1. */
export function autonomyLevel(slug: string, steps: StepShape[]): AutonomyLevel {
  if (steps.some((s) => s.kind === "agent")) return 3;
  if (LEVEL_2_SLUGS.has(slug) || steps.some((s) => s.when) || steps.filter((s) => s.kind === "llm").length >= 2) return 2;
  return 1;
}

/** The plain-words line under "How it works": what kind of engine is inside, and (for agents) the hard limits. */
export function autonomyLine(slug: string, steps: StepShape[]): string {
  const level = autonomyLevel(slug, steps);
  if (level === 3) {
    const a = steps.find((s) => s.kind === "agent");
    const n = a?.maxSteps ?? 8;
    const ceiling = a?.ceilingUsd ?? 0;
    return `It decides its own steps as it goes — up to ${n} steps, never more than $${ceiling.toFixed(2)} a run. It stops itself at whichever limit comes first${a?.verify ? ", then a second pass checks the result against its sources" : ""}.`;
  }
  if (level === 2) return "It runs set steps, with a few forks depending on your answers and what it finds. Predictable, and cheap to run.";
  return "It runs the same steps every time, in the same order. The cheapest, quickest, most predictable kind of app.";
}

/** "≈ $0.05" for fixed apps; "up to $0.60" for agents, where the number is a hard ceiling rather than a typical cost. */
export function costPrefix(slug: string, steps: StepShape[]): "≈" | "up to" {
  return autonomyLevel(slug, steps) === 3 ? "up to" : "≈";
}

/** Short reassurance shown under the consultant greeting. */
export const CONSULTANT_INTRO = "I'll ask a few quick questions, then run it once so you can see the real thing before it goes live.";
export const BRIEF_INTRO = "Fill in the blanks, then I'll run it once so you can see the real thing before it goes live.";
