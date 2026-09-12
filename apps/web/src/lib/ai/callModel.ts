import "server-only";
import { getProviderKey } from "@/lib/env";
import { splitModelId, type ModelCallOptions, type ModelCallResult } from "./types";

/**
 * callModel — the single abstraction every LLM call goes through (Task 1.5 / 2.1).
 * OpenRouter today; LiteLLM later = add a provider branch, nothing else changes.
 * Does NOT meter or gate — wrap it with finance/metered.
 */
export async function callModel(opts: ModelCallOptions): Promise<ModelCallResult> {
  const { provider, model } = splitModelId(opts.model);
  const t0 = Date.now();
  switch (provider) {
    case "openrouter":
      return openRouter(model, opts, t0);
    case "mock":
      return mock(model, opts, t0);
    default:
      throw new Error(`UNKNOWN_PROVIDER ${provider}`);
  }
}

async function openRouter(model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const key = getProviderKey("openrouter");
  if (!key) throw new Error("NO_KEY openrouter — set OPENROUTER_API_KEY");
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1500,
    usage: { include: true },
  };
  if (opts.jsonSchema) {
    body.response_format = { type: "json_schema", json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema } };
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://all41.app",
      "X-Title": "all41",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OPENROUTER_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  const usage = { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 };
  return {
    text,
    json: opts.jsonSchema ? safeJson(text) : undefined,
    usage,
    latencyMs: Date.now() - t0,
    provider: "openrouter",
    model,
    reportedCostUsd: typeof data.usage?.cost === "number" ? data.usage.cost : undefined,
  };
}

/** Deterministic offline provider so the whole spine can be exercised with zero keys. */
async function mock(model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const last = opts.messages[opts.messages.length - 1]?.content ?? "";
  const inputTokens = Math.ceil(opts.messages.reduce((n, m) => n + m.content.length, 0) / 4);
  let text: string;
  let json: unknown;
  if (opts.jsonSchema) {
    json = mockJson(opts.jsonSchema.schema, last);
    text = JSON.stringify(json);
  } else {
    text = `[mock:${model}] ${last.slice(0, 200)}`;
  }
  await new Promise((r) => setTimeout(r, 30));
  return {
    text, json,
    usage: { inputTokens, outputTokens: Math.ceil(text.length / 4) },
    latencyMs: Date.now() - t0, provider: "mock", model, isMock: true,
  };
}

function mockJson(schema: Record<string, unknown>, seed: string): unknown {
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (Array.isArray(v.enum)) out[k] = v.enum[0];
    else if (v.type === "number") out[k] = 0.9;
    else if (v.type === "boolean") out[k] = true;
    else if (v.type === "array") out[k] = v.items && (v.items as Record<string, unknown>).type === "object" ? [mockJson(v.items as Record<string, unknown>, seed)] : ["mock"];
    else if (v.type === "object") out[k] = mockJson(v, seed);
    else out[k] = `[mock] ${k}: ${seed.slice(0, 80)}`;
  }
  return out;
}

export function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fallthrough */ }
    }
    return undefined;
  }
}
