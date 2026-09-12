export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Model ids are "provider:model" — e.g. "anthropic:claude-sonnet-5", "google:gemini-2.5-flash", "mock:mock-model". */
export type ModelId = `${string}:${string}`;

export function splitModelId(id: string): { provider: string; model: string } {
  const i = id.indexOf(":");
  if (i < 0) return { provider: "mock", model: id };
  return { provider: id.slice(0, i), model: id.slice(i + 1) };
}

export type ModelCallOptions = {
  model: ModelId | string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for JSON conforming to this schema (structured output, layer 4). */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

export type ModelCallResult = {
  text: string;
  json?: unknown;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  provider: string;
  model: string;
  /** Exact cost reported by the provider, if any — preferred over rate math when present. */
  reportedCostUsd?: number;
  isMock?: boolean;
};

export const TASK_TYPES = [
  "research", "synthesis", "reasoning", "code", "content", "summarize", "classify", "crawl", "verify", "edges",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];
