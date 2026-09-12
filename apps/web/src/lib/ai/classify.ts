import "server-only";
import { TASK_TYPES, type TaskType } from "./types";

/** Closed set the user-facing classifier maps into (Task 2.2). */
export const INTENTS = ["research", "content", "synthesis", "reasoning", "code", "summarize"] as const;
export type Intent = (typeof INTENTS)[number];

export const INTENT_SCHEMA = {
  name: "intent",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intent", "confidence"],
    properties: {
      intent: { type: "string", enum: [...INTENTS] },
      confidence: { type: "number" },
    },
  },
};

export const CLASSIFY_SYSTEM = `Classify the user's request into exactly one task type.
research = needs fresh external information (news, competitors, market, prices)
content = write posts, emails, copy, scripts
synthesis = combine/compare given material into a report or table
reasoning = analysis, decisions, strategy, math, planning
code = write or fix code, SQL, formulas
summarize = condense given text
Respond with JSON only.`;

/** Zero-cost heuristic used as the mock path and as a sanity fallback. */
export function heuristicIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(code|sql|regex|function|bug|script|formula|typescript|python)\b/.test(t)) return "code";
  if (/\b(summar|tl;dr|condense|shorten)/.test(t)) return "summarize";
  if (/\b(write|draft|post|email|caption|copy|newsletter|linkedin|tweet)\b/.test(t)) return "content";
  if (/\b(compare|versus|vs\.?|table|report|combine)\b/.test(t)) return "synthesis";
  if (/\b(news|latest|competitor|market|price|pricing|trend|research|find out|who is|what is)\b/.test(t)) return "research";
  return "reasoning";
}

export function isTaskType(x: string): x is TaskType {
  return (TASK_TYPES as readonly string[]).includes(x);
}
