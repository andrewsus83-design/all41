import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { checkBalance, estimateCost, metered } from "@/lib/finance";
import { fetchGrounding, type GroundingBundle } from "./grounding";
import { OUTPUT_SCHEMAS, type OutputSchemaKey } from "./schemas";
import { verifyOutput, type Verification } from "./verify";
import type { SearchResult } from "./apps";

/**
 * Level 3 — a bounded autonomous agent (docs/APP_AUTONOMY_GUIDE.md).
 * plan → act → observe, with the five mandatory guardrails:
 *   1. hard step cap (`max_steps`)            2. hard credit ceiling (`credit_ceiling_usd`, tracked from every metered() result)
 *   3. every call metered (nothing bypasses metered())   4. pre-flight: the balance must cover the CEILING, not the estimate
 *   5. verification pass at the end (`verify: true`) — conflicts are surfaced, never passed silently.
 * If the loop stops on a cap it STILL writes up what it found — never nothing after spending.
 */

export const AGENT_TOOLS = ["search", "crawl", "graph", "user_data"] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];

export type AgentStep = {
  id: string;
  kind: "agent";
  task_type: string;
  schema: OutputSchemaKey;
  /** The goal in plain words, with {{key}} placeholders from the instance config. */
  goal: string;
  tools: AgentTool[];
  /** Tools offered only when a "key=Value" condition on the config holds (same grammar as `when`). */
  tools_if?: Partial<Record<AgentTool, string>>;
  /** Config keys whose (pasted) text is treated as user data, not inlined into the goal. */
  paste_keys?: string[];
  max_steps: number;
  /** Step cap that follows an answer, e.g. depth Quick/Standard/Deep → 4/8/12 (case-insensitive match). */
  max_steps_from?: { key: string; values: Record<string, number> };
  credit_ceiling_usd: number;
  verify?: boolean;
  when?: string;
};

export type AgentStopReason = "finished" | "step_cap" | "credit_ceiling";

/** Progress events for the SSE stream — plain words, safe to show. */
export type AgentEvent =
  | { step: "agent.plan"; n: number; of: number; thought: string }
  | { step: "agent.tool"; n: number; tool: AgentTool; input: string }
  | { step: "agent.observe"; n: number; summary: string; spentUsd: number }
  | { step: "agent.stop"; reason: AgentStopReason; n: number; of: number; spentUsd: number; ceilingUsd: number }
  | { step: "agent.verify"; verdict: Verification["verdict"] | "skipped"; conflicts: number };

export type NotebookSource = { ref: string; title: string; url?: string };
export type NotebookEntry = { n: number; tool: AgentTool; input: string; body: string; sources: NotebookSource[] };

export type AgentTools = {
  search: (query: string) => Promise<{ results: SearchResult[]; isMock: boolean; billedUsd: number }>;
  crawl: (url: string) => Promise<{ url: string; markdown: string; isMock: boolean; billedUsd: number }>;
  /** Defaults to the graph engine's /query. */
  graph?: (query: string) => Promise<GroundingBundle>;
  /** Pre-flight per-call estimates (0 when the provider is mocked). */
  estimates: { search: number; crawl: number };
};

export type AgentContext = {
  userId: string;
  taskId: string;
  config: Record<string, unknown>;
  /** The USER DATA block ([D#] …) — "" when nothing is attached. */
  userData: string;
  tools: AgentTools;
  onEvent?: (e: AgentEvent) => void;
};

export type AgentTrailEntry = { n: number; tool: AgentTool; input: string; summary: string; sources: number };

export type AgentStepResult = {
  id: string;
  kind: "agent";
  model: string;
  output: unknown;
  schema: OutputSchemaKey;
  isMock: boolean;
  billedUsd: number;
  modelsUsed: string[];
  verification?: Verification;
  agent: {
    iterations: number;
    maxSteps: number;
    ceilingUsd: number;
    spentUsd: number;
    stopReason: AgentStopReason;
    verified: boolean;
    sources: NotebookSource[];
    trail: AgentTrailEntry[];
  };
};

type Config = Record<string, unknown>;
type Decision = { thought: string; action: AgentTool | "finish"; input: string; done_reason: string };

const NOTEBOOK_CHARS = 14_000; // ≈3.5k tokens of findings carried into every planner call
const OBS_CHARS = 1_800; // per observation body kept in the notebook
const SYNTH_OUTPUT_TOKENS = 1_500;
const PLAN_OUTPUT_TOKENS = 250;

// ---- limits (config-aware) ----

function norm(v: unknown) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v ?? "").trim().toLowerCase();
}

function condHolds(cond: string | undefined, config: Config) {
  if (!cond) return true;
  const i = cond.indexOf("=");
  if (i < 0) return true;
  const key = cond.slice(0, i).trim();
  const want = norm(cond.slice(i + 1));
  const have = config[key];
  if (Array.isArray(have)) return have.some((x) => norm(x) === want);
  return norm(have) === want;
}

function isTool(t: unknown): t is AgentTool {
  return typeof t === "string" && (AGENT_TOOLS as readonly string[]).includes(t);
}

/** The effective step cap, credit ceiling and tool set for one run of an agent step. Pure — used by describe/estimate too. */
export function resolveAgentLimits(step: AgentStep, config: Config = {}): { maxSteps: number; ceilingUsd: number; tools: AgentTool[]; verify: boolean } {
  let maxSteps = Math.max(1, Math.floor(Number(step.max_steps) || 1));
  if (step.max_steps_from) {
    const have = norm(config[step.max_steps_from.key]);
    for (const [k, v] of Object.entries(step.max_steps_from.values ?? {})) if (norm(k) === have && Number(v) > 0) maxSteps = Math.floor(Number(v));
  }
  const ceilingUsd = Math.max(0, Number(step.credit_ceiling_usd) || 0);
  const tools: AgentTool[] = [];
  for (const t of step.tools ?? []) if (isTool(t) && !tools.includes(t)) tools.push(t);
  for (const [t, cond] of Object.entries(step.tools_if ?? {})) if (isTool(t) && !tools.includes(t) && condHolds(cond, config)) tools.push(t);
  return { maxSteps, ceilingUsd, tools, verify: Boolean(step.verify) };
}

// ---- notebook ----

function clip(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Compact, token-budgeted notebook: newest findings in full, older ones folded to one line once the budget is spent. */
function notebookText(entries: NotebookEntry[]) {
  if (!entries.length) return "(empty — nothing found yet)";
  const rendered: string[] = [];
  let used = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const head = `#${e.n} ${e.tool}(“${clip(e.input, 120)}”)`;
    const full = `${head}\n${e.body}`;
    if (used + full.length <= NOTEBOOK_CHARS) {
      rendered.unshift(full);
      used += full.length;
    } else {
      rendered.unshift(`${head} → ${e.sources.length ? e.sources.map((s) => s.ref).join(", ") : "no sources"} (folded)`);
      used += head.length + 40;
    }
  }
  return rendered.join("\n\n");
}

function answersSummary(config: Config, skip: Set<string>) {
  return Object.entries(config)
    .filter(([k]) => k !== "data" && k !== "brief_note" && !skip.has(k))
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

function renderGoal(tpl: string, config: Config, skip: Set<string>) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (skip.has(key)) return "(see USER DATA)";
    const v = config[key];
    if (v === undefined || v === null) return "";
    return Array.isArray(v) ? v.join(", ") : String(v);
  });
}

/** Pasted long-form answers (e.g. `source_text`) join the user-data block as D# sources instead of bloating the goal. */
function withPastedData(userData: string, config: Config, keys: string[]) {
  const existing = (userData.match(/\[D(\d+)\]/g) ?? []).length;
  let ref = existing;
  const parts = userData ? [userData] : [];
  for (const k of keys) {
    const v = config[k];
    const text = (Array.isArray(v) ? v.join("\n") : typeof v === "string" ? v : "").trim();
    if (!text) continue;
    ref += 1;
    parts.push(`[D${ref}] PASTED “${k}”:\n${text.slice(0, 24_000)}`);
  }
  return parts.join("\n\n");
}

// ---- planner ----

const PLANNER_SYSTEM = `You are all41's planner for a bounded investigation. You work toward one GOAL in small steps. Each turn you read the NOTEBOOK (everything found so far) and choose exactly ONE next action.
Tools:
- search: web search. input = a specific query. Never repeat a query already in the notebook.
- crawl: read one web page in full. input = a complete URL, normally one you saw in a search result. Prefer this over another search when a result looks promising.
- graph: the user's own connected knowledge (past work, notes, files). input = what to look for.
- user_data: the documents the user attached to this app. input = what you're looking for in them.
- finish: the notebook can now answer the goal, or further steps would not add anything.
Rules: be economical — every step costs the user money; go wide first, then deep only where it changes the answer; finish as soon as you have enough. Respond with JSON only.`;

function plannerSchema(tools: AgentTool[]) {
  return {
    name: "agent_plan",
    schema: {
      type: "object", additionalProperties: false,
      required: ["thought", "action", "input", "done_reason"],
      properties: {
        thought: { type: "string", description: "One or two sentences: what you know, what's missing, why this action." },
        action: { type: "string", enum: [...tools, "finish"] },
        input: { type: "string", description: "The query, URL, or what to look for. Empty for finish." },
        done_reason: { type: "string", description: "Only for finish: why the notebook is enough." },
      },
    },
  };
}

function plannerMessages(args: { goal: string; answers: string; hasData: boolean; tools: AgentTool[]; notebook: NotebookEntry[]; n: number; of: number; leftUsd: number }): ChatMessage[] {
  return [
    { role: "system", content: PLANNER_SYSTEM },
    {
      role: "user",
      content: `GOAL:\n${args.goal}\n\nANSWERS FROM THE USER:\n${args.answers || "(none)"}\n\nUSER DATA ATTACHED: ${args.hasData ? "yes — use the user_data tool to read it" : "no"}\nTOOLS YOU MAY USE: ${args.tools.join(", ")}, finish\n\nNOTEBOOK:\n${notebookText(args.notebook)}\n\nThis is step ${args.n} of at most ${args.of}. Budget left: about $${args.leftUsd.toFixed(2)}. Choose the next action.`,
    },
  ];
}

/** Offline (mock) planner: deterministic search → crawl → graph (→ user_data when attached) → finish, so caps and ceilings are exercised at $0 tool cost. */
function scriptedDecision(n: number, tools: AgentTool[], hasData: boolean, goal: string, notebook: NotebookEntry[]): Decision {
  const order: AgentTool[] = ["search", "crawl", "graph", ...(hasData ? (["user_data"] as AgentTool[]) : [])];
  const script = order.filter((t) => tools.includes(t));
  const action = script[n - 1];
  if (!action) return { thought: "The notebook covers the goal well enough.", action: "finish", input: "", done_reason: "scripted (offline) planner finished" };
  const topic = clip(goal, 80);
  const link = notebook.flatMap((e) => e.sources).find((s) => s.url)?.url ?? "";
  const input = action === "crawl" ? link || `https://example.com/${encodeURIComponent(topic.split(/\s+/)[0] ?? "page").toLowerCase()}` : topic;
  return { thought: `[offline planner] step ${n}: ${action}`, action, input, done_reason: "" };
}

function coerceDecision(raw: unknown, tools: AgentTool[]): Decision {
  const j = (raw && typeof raw === "object" ? raw : {}) as Partial<Decision>;
  const action = isTool(j.action) && tools.includes(j.action) ? j.action : "finish";
  return { thought: String(j.thought ?? "").slice(0, 400), action, input: String(j.input ?? "").slice(0, 400), done_reason: String(j.done_reason ?? "").slice(0, 200) };
}

// ---- tools → observations ----

async function observe(ctx: AgentContext, tool: AgentTool, input: string, notebook: NotebookEntry[], nextRef: () => string): Promise<{ body: string; sources: NotebookSource[]; billedUsd: number; isMock: boolean }> {
  if (tool === "search") {
    const r = await ctx.tools.search(input);
    const sources: NotebookSource[] = [];
    const lines = r.results.slice(0, 6).map((x) => {
      const ref = nextRef();
      sources.push({ ref, title: x.title, url: x.link });
      return `[${ref}] ${clip(x.title, 100)} — ${x.link}\n${clip(x.snippet, 220)}`;
    });
    return { body: lines.join("\n") || "(no results)", sources, billedUsd: r.billedUsd, isMock: r.isMock };
  }
  if (tool === "crawl") {
    let url = input.trim();
    if (!/^https?:\/\//i.test(url)) {
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(url)) url = `https://${url}`;
      else url = notebook.flatMap((e) => e.sources).find((s) => s.url)?.url ?? "";
    }
    if (!url) return { body: "(nothing to read — no page URL known yet)", sources: [], billedUsd: 0, isMock: false };
    const r = await ctx.tools.crawl(url);
    const ref = nextRef();
    const title = (r.markdown.match(/^#\s+(.+)$/m)?.[1] ?? url).trim();
    return { body: `[${ref}] ${url}\n${clip(r.markdown, OBS_CHARS)}`, sources: [{ ref, title: clip(title, 100), url }], billedUsd: r.billedUsd, isMock: r.isMock };
  }
  if (tool === "graph") {
    const g = await (ctx.tools.graph ?? ((q: string) => fetchGrounding(ctx.userId, q, 3000)))(input);
    if (!g.chunks.length) return { body: "(nothing connected in the user's knowledge for this)", sources: [], billedUsd: 0, isMock: false };
    const sources: NotebookSource[] = [];
    const body = g.chunks.slice(0, 6).map((c) => {
      const ref = nextRef();
      sources.push({ ref, title: c.title ?? c.node_type });
      return `[${ref}] (${c.node_type}${c.title ? ` · ${c.title}` : ""})\n${clip(c.content, 500)}`;
    }).join("\n");
    return { body, sources, billedUsd: 0, isMock: false };
  }
  // user_data — the attached block is already D#-referenced; the notebook keeps a trimmed copy, the writer gets it in full.
  return { body: ctx.userData ? clip(ctx.userData, 2_500) : "(nothing attached)", sources: [], billedUsd: 0, isMock: false };
}

// ---- the loop ----

async function billedForTask(taskId: string) {
  const { data } = await adminClient().from("api_usage_log").select("billed_usd").eq("task_id", taskId);
  return (data ?? []).reduce((n, r) => n + Number(r.billed_usd), 0);
}

const WRITER_SYSTEM = `You are all41, a sharp work engine for solo operators. Write the final result ONLY from the NOTEBOOK, the USER DATA, and clearly-labelled general knowledge.
Cite every factual claim with a source ref: [S1]/[S2] for notebook sources, [D1]/[D2] for user data, or "general". Never invent numbers. If the investigation stopped early, say plainly what is still unknown. Respond with JSON matching the schema.`;

export async function runAgentStep(ctx: AgentContext, step: AgentStep): Promise<AgentStepResult> {
  const emit = (e: AgentEvent) => ctx.onEvent?.(e);
  const { maxSteps, ceilingUsd, tools, verify } = resolveAgentLimits(step, ctx.config);
  const schemaKey: OutputSchemaKey = step.schema in OUTPUT_SCHEMAS ? step.schema : "answer";

  // Guardrail 4 — pre-flight on the CEILING (a Level-3 run can cost 10-50× a Level-1 run). Nothing is spent before this.
  await checkBalance(ctx.userId, ceilingUsd);

  const { modelId, isMock } = await routeTask(step.task_type);
  const { provider, model } = splitModelId(modelId);
  const modelsUsed = [modelId];
  const skip = new Set(step.paste_keys ?? []);
  const goal = renderGoal(step.goal, ctx.config, skip);
  const answers = answersSummary(ctx.config, skip);
  const userData = withPastedData(ctx.userData, ctx.config, step.paste_keys ?? []);
  const hasData = userData.length > 0;

  const notebook: NotebookEntry[] = [];
  const sources: NotebookSource[] = [];
  let refN = 0;
  const nextRef = () => { refN += 1; const ref = `S${refN}`; return ref; };
  const trail: AgentTrailEntry[] = [];
  let spent = 0; // guardrail 2 — billedSoFar, from every metered() result
  let anyMock = isMock;
  let n = 0;
  let stopReason: AgentStopReason = "finished";

  // The write-up always runs, so its cost is reserved: the loop may not spend into it.
  const synthReserve = (await estimateCost(provider, model, WRITER_SYSTEM.length + goal.length + NOTEBOOK_CHARS + Math.min(userData.length, 24_000) + 800, SYNTH_OUTPUT_TOKENS)).billedUsd;

  for (;;) {
    if (n >= maxSteps) { stopReason = "step_cap"; break; } // guardrail 1
    const messages = plannerMessages({ goal, answers, hasData, tools, notebook, n: n + 1, of: maxSteps, leftUsd: Math.max(0, ceilingUsd - spent - synthReserve) });
    const planEst = (await estimateCost(provider, model, messages.reduce((c, m) => c + m.content.length, 0), PLAN_OUTPUT_TOKENS)).billedUsd;
    if (spent + planEst + synthReserve > ceilingUsd) { stopReason = "credit_ceiling"; break; } // guardrail 2
    n += 1;
    const plan = await metered({
      userId: ctx.userId, taskId: ctx.taskId, provider, model, callKind: "llm", estimatedBilledUsd: planEst,
      call: async () => {
        const out = await callModel({ model: modelId, messages, jsonSchema: plannerSchema(tools), temperature: 0, maxTokens: 400 });
        return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
      },
    });
    spent += plan.billedUsd;
    const decision = isMock ? scriptedDecision(n, tools, hasData, goal, notebook) : coerceDecision(plan.result.json, tools);
    emit({ step: "agent.plan", n, of: maxSteps, thought: decision.thought || (decision.action === "finish" ? decision.done_reason : `Next: ${decision.action}`) });
    if (decision.action === "finish") { stopReason = "finished"; break; }

    const toolEst = decision.action === "search" ? ctx.tools.estimates.search : decision.action === "crawl" ? ctx.tools.estimates.crawl : 0;
    if (spent + toolEst + synthReserve > ceilingUsd) { stopReason = "credit_ceiling"; break; } // guardrail 2 (tool call)
    emit({ step: "agent.tool", n, tool: decision.action, input: decision.input });
    let obs: Awaited<ReturnType<typeof observe>>;
    try {
      obs = await observe(ctx, decision.action, decision.input, notebook, nextRef);
    } catch (err) {
      // a failed tool call is logged (billed 0) by metered(); the agent notes it and carries on
      obs = { body: `(${decision.action} failed: ${clip(err instanceof Error ? err.message : String(err), 160)})`, sources: [], billedUsd: 0, isMock: false };
    }
    spent += obs.billedUsd;
    anyMock = anyMock || obs.isMock;
    notebook.push({ n, tool: decision.action, input: decision.input, body: obs.body, sources: obs.sources });
    sources.push(...obs.sources);
    const summary = obs.sources.length ? `${obs.sources.length} ${obs.sources.length === 1 ? "source" : "sources"}` : clip(obs.body, 80);
    trail.push({ n, tool: decision.action, input: decision.input, summary, sources: obs.sources.length });
    emit({ step: "agent.observe", n, summary, spentUsd: spent });
  }
  emit({ step: "agent.stop", reason: stopReason, n, of: maxSteps, spentUsd: spent, ceilingUsd });

  // Final write-up — always, from whatever was gathered (the reserve above keeps it inside the ceiling in the normal case;
  // when the ceiling is smaller than one write-up call, this is the single call that may exceed it).
  const stoppedNote = stopReason === "step_cap"
    ? `NOTE: the investigation hit its step limit (${maxSteps} steps). Work from what is in the notebook and say what is still unknown.`
    : stopReason === "credit_ceiling"
      ? `NOTE: the investigation stopped at its spend limit ($${ceilingUsd.toFixed(2)}). Work from what is in the notebook and say what is still unknown.`
      : "";
  const writerMessages: ChatMessage[] = [
    { role: "system", content: WRITER_SYSTEM },
    { role: "user", content: `GOAL:\n${goal}\n\nANSWERS FROM THE USER:\n${answers || "(none)"}\n\nUSER DATA:\n${userData || "(none attached)"}\n\nNOTEBOOK (${notebook.length} ${notebook.length === 1 ? "finding" : "findings"}, ${sources.length} sources):\n${notebookText(notebook)}${stoppedNote ? `\n\n${stoppedNote}` : ""}\n\nWrite the final result now.` },
  ];
  const writeEst = (await estimateCost(provider, model, writerMessages.reduce((c, m) => c + m.content.length, 0), SYNTH_OUTPUT_TOKENS)).billedUsd;
  const written = await metered({
    userId: ctx.userId, taskId: ctx.taskId, provider, model, callKind: "llm", estimatedBilledUsd: writeEst,
    call: async () => {
      const out = await callModel({ model: modelId, messages: writerMessages, jsonSchema: OUTPUT_SCHEMAS[schemaKey], maxTokens: 2500 });
      return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
    },
  });
  spent += written.billedUsd;
  const output = written.result.json ?? { title: "Result", answer: written.result.text, key_points: [], next_action: "", sources: [], confidence: 0.5, gaps: ["unstructured output"] };

  // Guardrail 5 — a second model checks the write-up against the notebook. Skipped only when it would breach the ceiling.
  let verification: Verification | undefined;
  if (verify) {
    const v = await routeTask("verify");
    const vs = splitModelId(v.modelId);
    const verifyEst = (await estimateCost(vs.provider, vs.model, notebookText(notebook).length + Math.min(userData.length, 24_000) + JSON.stringify(output).length + 400, 400)).billedUsd;
    if (spent + verifyEst <= ceilingUsd) {
      // verifyOutput meters its own call but doesn't return the amount — reconcile from the usage log so `spent` stays exact
      const before = await billedForTask(ctx.taskId);
      verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output, context: `${notebookText(notebook)}${userData ? `\n\nUSER DATA:\n${userData}` : ""}` });
      spent += Math.max(0, (await billedForTask(ctx.taskId)) - before);
      modelsUsed.push(verification.model);
      emit({ step: "agent.verify", verdict: verification.verdict, conflicts: verification.conflicts.length });
    } else {
      emit({ step: "agent.verify", verdict: "skipped", conflicts: 0 });
    }
  }

  return {
    id: step.id, kind: "agent", model: modelId, output, schema: schemaKey, isMock: anyMock, billedUsd: spent, modelsUsed, verification,
    agent: { iterations: n, maxSteps, ceilingUsd, spentUsd: spent, stopReason, verified: Boolean(verification), sources, trail },
  };
}
