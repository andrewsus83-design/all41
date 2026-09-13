import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getProviderKey, primeSecrets, type Provider } from "@/lib/env";
import { PROVIDERS, isLlmProvider } from "./providers";
import { splitModelId, type ChatMessage, type ModelCallOptions, type ModelCallResult } from "./types";

/**
 * callModel — the single abstraction every LLM call goes through (Task 1.5 / 2.1).
 * Direct first-party providers only (no aggregators). Does NOT meter or gate — wrap with finance/metered.
 */
export async function callModel(opts: ModelCallOptions): Promise<ModelCallResult> {
  await primeSecrets();
  const { provider, model } = splitModelId(opts.model);
  if (!isLlmProvider(provider)) throw new Error(`UNKNOWN_PROVIDER ${provider}`);
  const t0 = Date.now();
  const spec = PROVIDERS[provider];
  if (spec.kind === "mock") return mock(model, opts, t0);
  const key = getProviderKey(provider as Provider);
  if (!key) throw new Error(`NO_KEY ${provider} — add it in /admin`);
  switch (spec.kind) {
    case "anthropic": return anthropic(key, model, opts, t0);
    case "openai-compat": return openaiCompat(provider, spec.baseUrl!, spec.json, key, model, opts, t0);
    case "google": return google(key, model, opts, t0);
  }
}

function jsonInstruction(opts: ModelCallOptions) {
  return opts.jsonSchema ? `\n\nRespond with a single JSON object only (no prose, no code fences) matching this JSON Schema:\n${JSON.stringify(opts.jsonSchema.schema)}` : "";
}

// ---------------- Anthropic (official SDK) ----------------
async function anthropic(key: string, model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const client = new Anthropic({ apiKey: key });
  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const messages: Anthropic.MessageParam[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "Proceed." });
  const req: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: opts.maxTokens ?? 4000,
    system: system || undefined,
    messages,
  };
  if (opts.jsonSchema) {
    // Structured outputs: output_config.format (JSON schema). Falls back to prompt+parse if the model rejects it.
    (req as unknown as Record<string, unknown>).output_config = { format: { type: "json_schema", schema: opts.jsonSchema.schema } };
  }
  let res: Anthropic.Message;
  try {
    res = await client.messages.create(req);
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError && opts.jsonSchema) {
      delete (req as unknown as Record<string, unknown>).output_config;
      req.system = (req.system ?? "") + jsonInstruction(opts);
      res = await client.messages.create(req);
    } else throw e;
  }
  if (res.stop_reason === "refusal") throw new Error(`ANTHROPIC_REFUSAL ${res.stop_details?.category ?? ""}`);
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  return {
    text, json: opts.jsonSchema ? safeJson(text) : undefined,
    usage: { inputTokens: res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0), outputTokens: res.usage.output_tokens },
    latencyMs: Date.now() - t0, provider: "anthropic", model,
  };
}

// ---------------- OpenAI-compatible (openai, groq, deepseek, perplexity, xai, mistral) ----------------
async function openaiCompat(provider: string, baseUrl: string, jsonMode: "native" | "json_object" | "prompt", key: string, model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const messages: ChatMessage[] = opts.messages.map((m) => ({ ...m }));
  const body: Record<string, unknown> = { model, messages, temperature: opts.temperature ?? 0.3, max_tokens: opts.maxTokens ?? 1500 };
  if (opts.jsonSchema) {
    if (jsonMode === "native") body.response_format = { type: "json_schema", json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema } };
    else if (jsonMode === "json_object") body.response_format = { type: "json_object" };
    const sys = messages.find((m) => m.role === "system");
    if (sys) sys.content += jsonInstruction(opts); else messages.unshift({ role: "system", content: jsonInstruction(opts).trim() });
  }
  if (model.startsWith("gpt-5") || model.startsWith("o")) { delete body.temperature; body.max_completion_tokens = body.max_tokens; delete body.max_tokens; }
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`${provider.toUpperCase()}_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  return {
    text, json: opts.jsonSchema ? safeJson(text) : undefined,
    usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 },
    latencyMs: Date.now() - t0, provider, model,
  };
}

// ---------------- Google Gemini ----------------
async function google(key: string, model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.maxTokens ?? 1500, ...(opts.jsonSchema ? { responseMimeType: "application/json" } : {}) },
  };
  if (system || opts.jsonSchema) body.systemInstruction = { parts: [{ text: system + jsonInstruction(opts) }] };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`GOOGLE_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  return {
    text, json: opts.jsonSchema ? safeJson(text) : undefined,
    usage: { inputTokens: data.usageMetadata?.promptTokenCount ?? 0, outputTokens: (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0) },
    latencyMs: Date.now() - t0, provider: "google", model,
  };
}

// ---------------- Mock (offline, deterministic) ----------------
async function mock(model: string, opts: ModelCallOptions, t0: number): Promise<ModelCallResult> {
  const last = opts.messages[opts.messages.length - 1]?.content ?? "";
  const inputTokens = Math.ceil(opts.messages.reduce((n, m) => n + m.content.length, 0) / 4);
  let text: string; let json: unknown;
  if (opts.jsonSchema) { json = mockJson(opts.jsonSchema.schema, last); text = JSON.stringify(json); }
  else text = `[mock:${model}] ${last.slice(0, 200)}`;
  await new Promise((r) => setTimeout(r, 30));
  return { text, json, usage: { inputTokens, outputTokens: Math.ceil(text.length / 4) }, latencyMs: Date.now() - t0, provider: "mock", model, isMock: true };
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
  try { return JSON.parse(text); } catch {
    const m = text.replace(/```(?:json)?/g, "").match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* fallthrough */ } }
    return undefined;
  }
}

/** /admin "test" helper: verify a key by listing models (or a 1-token call for providers without a list endpoint). */
export async function testProviderKey(provider: string, key: string): Promise<{ ok: boolean; detail: string; models?: string[] }> {
  if (!isLlmProvider(provider) && provider !== "firecrawl" && provider !== "serpapi" && provider !== "dataforseo") return { ok: false, detail: "unknown provider" };
  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey: key });
      const page = await client.models.list({ limit: 50 });
      return { ok: true, detail: `${page.data.length} models`, models: page.data.map((m) => m.id) };
    }
    if (provider === "google") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=50`, { headers: { "x-goog-api-key": key } });
      if (!r.ok) return { ok: false, detail: `${r.status} ${(await r.text()).slice(0, 120)}` };
      const d = await r.json(); const models = (d.models ?? []).map((m: { name: string }) => m.name.replace(/^models\//, ""));
      return { ok: true, detail: `${models.length} models`, models };
    }
    if (provider === "serpapi") {
      const r = await fetch(`https://serpapi.com/account.json?api_key=${encodeURIComponent(key)}`);
      return r.ok ? { ok: true, detail: "account ok" } : { ok: false, detail: `${r.status}` };
    }
    if (provider === "dataforseo") {
      const [login, password] = key.split(":");
      if (!password) return { ok: false, detail: "expected login:password" };
      const auth = Buffer.from(`${login}:${password}`).toString("base64");
      const r = await fetch("https://api.dataforseo.com/v3/appendix/user_data", { headers: { Authorization: `Basic ${auth}` } });
      if (!r.ok) return { ok: false, detail: `${r.status}` };
      const d = await r.json();
      const bal = d?.tasks?.[0]?.result?.[0]?.money?.balance;
      return { ok: true, detail: bal != null ? `account ok · $${bal} balance` : "account ok" };
    }
    if (provider === "firecrawl") {
      const r = await fetch("https://api.firecrawl.dev/v1/team/credit-usage", { headers: { Authorization: `Bearer ${key}` } });
      return r.ok ? { ok: true, detail: "credits ok" } : { ok: false, detail: `${r.status}` };
    }
    const spec = PROVIDERS[provider as keyof typeof PROVIDERS];
    if (spec.modelsUrl) {
      const r = await fetch(spec.modelsUrl, { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) return { ok: false, detail: `${r.status} ${(await r.text()).slice(0, 120)}` };
      const d = await r.json(); const models = (d.data ?? []).map((m: { id: string }) => m.id);
      return { ok: true, detail: `${models.length} models`, models };
    }
    // perplexity: no list endpoint — tiny completion
    const r = await fetch(`${spec.baseUrl}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: spec.suggested[0], messages: [{ role: "user", content: "ping" }], max_tokens: 5 }) });
    return r.ok ? { ok: true, detail: "ok" } : { ok: false, detail: `${r.status} ${(await r.text()).slice(0, 120)}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}
