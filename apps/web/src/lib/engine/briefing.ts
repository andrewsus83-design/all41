import { z } from "zod";

/** The 5-step briefing (Master Plan §9). Never a freeform prompt. */
export const BriefingSchema = z.object({
  what: z.string().min(3).max(600),                 // What do you need delivered?
  what_format: z.enum(["answer", "report", "list", "table", "draft", "plan"]).default("answer"),
  goal: z.string().min(3).max(400),                  // What decision does this help you make?
  condition: z.object({
    constraints: z.string().max(600).default(""),   // competitor, freshness, tone, format…
    freshness: z.enum(["any", "week", "day"]).default("any"),
    tone: z.enum(["direct", "warm", "formal", "playful"]).default("direct"),
    high_stakes: z.boolean().default(false),         // triggers verification loop
  }),
  execute: z.object({
    confirmed: z.boolean().default(false),           // the human-in-the-loop confirm step
    use_context: z.boolean().default(true),          // ground in the user's graph
  }),
  track: z.enum(["once", "remind", "daily", "weekly", "save_app"]).default("once"),
});
export type Briefing = z.infer<typeof BriefingSchema>;

export function briefingToUserPrompt(b: Briefing) {
  return [
    `DELIVERABLE (${b.what_format}): ${b.what}`,
    `DECISION THIS SUPPORTS: ${b.goal}`,
    b.condition.constraints ? `CONSTRAINTS: ${b.condition.constraints}` : null,
    `FRESHNESS: ${b.condition.freshness} · TONE: ${b.condition.tone}`,
  ].filter(Boolean).join("\n");
}

export function briefingIsVague(b: Partial<Briefing>) {
  const w = (b.what ?? "").trim();
  const g = (b.goal ?? "").trim();
  return w.split(/\s+/).length < 3 || g.split(/\s+/).length < 3;
}
