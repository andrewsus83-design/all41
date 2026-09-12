import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { fetchGrounding } from "@/lib/engine/grounding";
import { routeTask } from "./router";
import { callModel } from "./callModel";
import { splitModelId, type ChatMessage } from "./types";
import { estimateCost, metered } from "@/lib/finance";

/**
 * The AI room is a think tank on the user's own apps and the data those apps produced.
 * Nothing else. Every helper here is deterministic, token-budgeted and never guesses.
 */

export type Scope = { app_instance_ids: string[]; sheet_ids: string[] };

export type ScopedApp = { id: string; name: string; description: string; configSummary: string; schedule: string; status: string; runCount: number; totalSpendUsd: number };
export type ScopedSheet = { id: string; name: string; columns: string[]; rowCount: number };

export type ThinkTankContext = {
  text: string;
  tokens: number;
  apps: ScopedApp[];
  sheets: ScopedSheet[];
  groundingChunks: number;
};

// ---- token math (chars/4 — same rough rule the rest of the app uses) ----
export const TOTAL_BUDGET_TOKENS = 6000;
const RESULT_BUDGET_TOKENS = 800;
const GROUNDING_BUDGET_TOKENS = 1500;
const CUT = " …";

export function estimateTokens(s: string) {
  return Math.ceil(s.length / 4);
}

/** Cut a string to a token budget with a visible ellipsis. */
export function trimToTokens(s: string, tokens: number) {
  const max = tokens * 4;
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - CUT.length)).trimEnd() + CUT;
}

// ---- scope persisted on the thread: apps in ai_threads.app_instance_ids, sheets in the first system message meta ----
export function scopeMeta(scope: Scope): Json {
  return { scope: { app_instance_ids: scope.app_instance_ids, sheet_ids: scope.sheet_ids } } as unknown as Json;
}

export function readScope(appInstanceIds: string[] | null | undefined, systemMeta: Json | null | undefined): Scope {
  const m = (systemMeta ?? null) as { scope?: { sheet_ids?: unknown } } | null;
  const sheets = Array.isArray(m?.scope?.sheet_ids) ? (m!.scope!.sheet_ids as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return { app_instance_ids: appInstanceIds ?? [], sheet_ids: sheets };
}

// ---- context builder ----
type ColumnDef = { key: string; name: string };

function parseColumns(columns: Json): ColumnDef[] {
  if (!Array.isArray(columns)) return [];
  return columns
    .map((c): ColumnDef | null => {
      if (typeof c === "string") return { key: c, name: c };
      if (c && typeof c === "object" && !Array.isArray(c)) {
        const o = c as Record<string, unknown>;
        const key = String(o.key ?? o.id ?? o.name ?? o.label ?? "");
        const name = String(o.name ?? o.label ?? o.key ?? o.id ?? "");
        return key || name ? { key: key || name, name: name || key } : null;
      }
      return null;
    })
    .filter((c): c is ColumnDef => c !== null);
}

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function summarizeConfig(config: Json): string {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  return Object.entries(config as Record<string, unknown>)
    .filter(([k]) => k !== "schedule" && k !== "output_target")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

function resultText(result: Json | null): string {
  const r = (result ?? null) as { output?: unknown } | null;
  const out = r?.output ?? result;
  if (out === null || out === undefined) return "(empty)";
  if (typeof out === "string") return out;
  if (typeof out === "object" && !Array.isArray(out)) {
    const o = out as Record<string, unknown>;
    // task outputs are usually {title, answer|summary, key_points, next_action}
    const parts: string[] = [];
    if (o.title) parts.push(`Title: ${String(o.title)}`);
    if (o.answer) parts.push(String(o.answer));
    if (o.summary) parts.push(String(o.summary));
    if (Array.isArray(o.key_points) && o.key_points.length) parts.push(`Key points: ${o.key_points.map(String).join("; ")}`);
    if (o.next_action) parts.push(`Next action: ${String(o.next_action)}`);
    if (parts.length) return parts.join("\n");
  }
  return JSON.stringify(out);
}

/**
 * buildThinkTankContext — the whole world the model is allowed to see, ≤ ~6k tokens.
 * Apps and sheets come out in the order they were scoped; each block is trimmed with a visible "…" when cut.
 */
export async function buildThinkTankContext(userId: string, scope: Scope, lastUserMessage = ""): Promise<ThinkTankContext> {
  const db = adminClient();
  const blocks: string[] = [];
  let used = 0;
  const apps: ScopedApp[] = [];
  const sheets: ScopedSheet[] = [];

  // grounding is capped separately; reserve its budget up front so the apps never starve it entirely
  const groundingPromise = lastUserMessage.trim()
    ? fetchGrounding(userId, lastUserMessage, GROUNDING_BUDGET_TOKENS)
    : Promise.resolve({ chunks: [], tokenCount: 0, engine: "none" as const });

  const push = (s: string) => {
    const t = estimateTokens(s);
    const remaining = TOTAL_BUDGET_TOKENS - GROUNDING_BUDGET_TOKENS - used;
    if (remaining <= 20) return false;
    const cut = t > remaining ? trimToTokens(s, remaining) : s;
    blocks.push(cut);
    used += estimateTokens(cut);
    return true;
  };

  // ---- apps ----
  if (scope.app_instance_ids.length) {
    const { data: rows } = await db
      .from("user_app_instances")
      .select("id, name, config, schedule, status, run_count, output_target, mini_apps(name, description)")
      .eq("user_id", userId)
      .in("id", scope.app_instance_ids);
    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const ordered = scope.app_instance_ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

    const { data: taskRows } = ordered.length
      ? await db
          .from("tasks")
          .select("id, app_instance_id, status, total_billed, completed_at, result")
          .eq("user_id", userId)
          .in("app_instance_id", ordered.map((r) => r.id))
          .order("completed_at", { ascending: false, nullsFirst: false })
      : { data: [] as Array<{ id: string; app_instance_id: string | null; status: string; total_billed: number; completed_at: string | null; result: Json | null }> };

    for (const r of ordered) {
      const mini = r.mini_apps as unknown as { name: string; description: string | null } | null;
      const mine = (taskRows ?? []).filter((t) => t.app_instance_id === r.id);
      const done = mine.filter((t) => t.status === "done");
      const totalSpend = mine.reduce((n, t) => n + Number(t.total_billed ?? 0), 0);
      const app: ScopedApp = {
        id: r.id,
        name: r.name ?? mini?.name ?? "App",
        description: mini?.description ?? "",
        configSummary: summarizeConfig(r.config),
        schedule: `${r.schedule} → ${r.output_target}`,
        status: r.status,
        runCount: Number(r.run_count ?? 0),
        totalSpendUsd: totalSpend,
      };
      apps.push(app);
      const lines = [
        `## APP: ${app.name}`,
        app.description ? `What it does: ${app.description}` : "",
        app.configSummary ? `Set up as: ${app.configSummary}` : "",
        `Schedule: ${app.schedule} · status: ${app.status} · runs: ${app.runCount} · total spend: $${totalSpend.toFixed(4)}`,
      ].filter(Boolean);
      if (!done.length) lines.push("Last results: none yet.");
      else {
        lines.push(`Last results (${Math.min(3, done.length)} of ${done.length}):`);
        done.slice(0, 3).forEach((t, i) => {
          const when = t.completed_at ? t.completed_at.slice(0, 16).replace("T", " ") : "unknown time";
          lines.push(`### Result ${i + 1} · ${when} · billed $${Number(t.total_billed ?? 0).toFixed(4)}`);
          lines.push(trimToTokens(resultText(t.result), RESULT_BUDGET_TOKENS));
        });
      }
      if (!push(lines.join("\n"))) break;
    }
  }

  // ---- sheets ----
  if (scope.sheet_ids.length) {
    const { data: tables } = await db.from("user_tables").select("id, name, columns").eq("user_id", userId).in("id", scope.sheet_ids);
    const byId = new Map((tables ?? []).map((t) => [t.id, t]));
    const ordered = scope.sheet_ids.map((id) => byId.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
    for (const t of ordered) {
      const cols = parseColumns(t.columns);
      const [{ data: rows }, { count }] = await Promise.all([
        db.from("user_rows").select("data").eq("user_id", userId).eq("table_id", t.id).order("created_at", { ascending: true }).limit(50),
        db.from("user_rows").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("table_id", t.id),
      ]);
      const effectiveCols = cols.length
        ? cols
        : Array.from(new Set((rows ?? []).flatMap((r) => (r.data && typeof r.data === "object" && !Array.isArray(r.data) ? Object.keys(r.data as object) : [])))).map((k) => ({ key: k, name: k }));
      const sheet: ScopedSheet = { id: t.id, name: t.name, columns: effectiveCols.map((c) => c.name), rowCount: count ?? (rows?.length ?? 0) };
      sheets.push(sheet);
      const csv = [
        effectiveCols.map((c) => csvCell(c.name)).join(","),
        ...(rows ?? []).map((r) => {
          const d = (r.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : {}) as Record<string, unknown>;
          return effectiveCols.map((c) => csvCell(d[c.key] ?? d[c.name])).join(",");
        }),
      ].join("\n");
      const lines = [
        `## SHEET: ${sheet.name}`,
        `Columns: ${sheet.columns.join(", ") || "(none)"} · rows: ${sheet.rowCount}${sheet.rowCount > 50 ? " (first 50 shown)" : ""}`,
        csv,
      ];
      if (!push(lines.join("\n"))) break;
    }
  }

  // ---- connected notes (graph engine), hard-capped ----
  const grounding = await groundingPromise;
  if (grounding.chunks.length) {
    const g = grounding.chunks.map((c, i) => `[N${i + 1}] ${c.title ? `${c.title}: ` : ""}${c.content}`).join("\n\n");
    blocks.push(`## CONNECTED NOTES\n${trimToTokens(g, GROUNDING_BUDGET_TOKENS)}`);
  }

  const text = blocks.length ? blocks.join("\n\n") : "(nothing in scope yet)";
  return { text, tokens: estimateTokens(text), apps, sheets, groundingChunks: grounding.chunks.length };
}

// ---- guardrail ----
const IN_SCOPE_WORDS = /\b(result|results|run|runs|ran|improve|improving|better|data|next|why|how|what if|schedule|cost|costs|spend|change|changes|missing|summar\w*|finding|findings|output|report|app|apps|sheet|column|row|rows)\b/i;

export const SCOPE_SCHEMA = {
  name: "scope_check",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["in_scope", "reason"],
    properties: { in_scope: { type: "boolean" }, reason: { type: "string" } },
  },
};

export type ScopeCheck = { inScope: boolean; how: "heuristic" | "model" | "mock"; billedUsd: number; reason?: string };

/**
 * Cheap first: the message names a scoped app, sheet or column, or uses think-tank words → in scope, $0.
 * Otherwise one small classify call (metered). With no provider keys (mock) we do not let the mock decide —
 * off-topic stays off-topic so the guardrail is real in dev.
 */
export async function classifyScope(userId: string, message: string, ctx: Pick<ThinkTankContext, "apps" | "sheets">): Promise<ScopeCheck> {
  const t = message.toLowerCase();
  const names = [
    ...ctx.apps.map((a) => a.name),
    ...ctx.sheets.map((s) => s.name),
    ...ctx.sheets.flatMap((s) => s.columns),
  ].map((n) => n.toLowerCase().trim()).filter((n) => n.length >= 3);
  if (names.some((n) => t.includes(n)) || IN_SCOPE_WORDS.test(message)) return { inScope: true, how: "heuristic", billedUsd: 0 };

  const { modelId, isMock } = await routeTask("classify");
  if (isMock) return { inScope: false, how: "mock", billedUsd: 0, reason: "no keyword or name match" };

  const { provider, model } = splitModelId(modelId);
  const system = `You decide whether a message belongs in a think-tank room whose ONLY purpose is the user's own apps and the data those apps produced.
Apps in scope: ${ctx.apps.map((a) => a.name).join(", ") || "none"}. Sheets in scope: ${ctx.sheets.map((s) => s.name).join(", ") || "none"}.
in_scope=true only if the message is about improving, understanding, scheduling, costing or acting on those apps/sheets/results. Anything else (general chat, unrelated writing, trivia) is false. JSON only.`;
  const messages: ChatMessage[] = [{ role: "system", content: system }, { role: "user", content: message.slice(0, 1500) }];
  const est = await estimateCost(provider, model, system.length + message.length, 30);
  const r = await metered({
    userId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
    call: async () => {
      const out = await callModel({ model: modelId, messages, jsonSchema: SCOPE_SCHEMA, temperature: 0, maxTokens: 60 });
      return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
    },
  });
  const j = r.result.json as { in_scope?: unknown; reason?: unknown } | undefined;
  return { inScope: j?.in_scope === true, how: "model", billedUsd: r.billedUsd, reason: typeof j?.reason === "string" ? j.reason : undefined };
}

/** The $0 reply when a message is off-topic. Plain words, no scolding. */
export function offTopicReply(ctx: Pick<ThinkTankContext, "apps" | "sheets">) {
  const appNames = ctx.apps.map((a) => a.name);
  const sheetNames = ctx.sheets.map((s) => s.name);
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);
  const parts = ["This room only works on your apps and their results."];
  if (appNames.length) parts.push(`Ask me how to improve ${list(appNames)}, or what the last runs mean.`);
  if (sheetNames.length) parts.push(`Or start from what's in ${list(sheetNames)}.`);
  if (!appNames.length && !sheetNames.length) parts.push("Pick an app or a sheet above to start.");
  return parts.join(" ");
}

export const THINKTANK_SYSTEM = `You are the think tank for the user's apps. You may only discuss the apps and data in CONTEXT. Ground every claim in CONTEXT; if it isn't there, say so. Be concrete: propose improvements as changes to the app's answers/schedule/data, and next actions. Never invent numbers. Plain words, calm tone, short paragraphs.`;

/** Which scoped apps a reply proposes changing (name mentioned + a change verb) → "Open {app} to edit" buttons. */
export function suggestedApps(reply: string, apps: ScopedApp[]): Array<{ id: string; name: string }> {
  const t = reply.toLowerCase();
  if (!/\b(change|changes|improve|update|edit|adjust|switch|set|add|remove|narrow|widen|tweak|reschedule|schedule)\b/.test(t)) return [];
  const seen = new Set<string>();
  return apps.filter((a) => {
    const n = a.name.toLowerCase();
    if (!n || seen.has(n) || !t.includes(n)) return false;
    seen.add(n);
    return true;
  }).map((a) => ({ id: a.id, name: a.name }));
}
