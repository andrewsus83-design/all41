import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { estimateCost, getBalance, InsufficientCreditError, metered } from "@/lib/finance";
import {
  buildThinkTankContext, classifyScope, offTopicReply, readScope, scopeMeta, suggestedApps, THINKTANK_SYSTEM, type Scope,
} from "@/lib/ai/thinktank";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  threadId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(4000),
  scope: z.object({ app_instance_ids: z.array(z.string().uuid()).default([]), sheet_ids: z.array(z.string().uuid()).default([]) }).optional(),
});

const HISTORY_LIMIT = 12;

/**
 * One turn in the think tank. SSE frames: {status} … then exactly one of
 * {done, threadId, user, assistant, balance} · {blocked, message} · {error, message}.
 * Off-topic messages never reach the main model and are stored as a $0 assistant reply.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("UNAUTHENTICATED", { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: "INVALID_BODY", issues: parsed.error.issues }), { status: 400 });
  const { message } = parsed.data;
  const db = adminClient();

  // ---- resolve the thread + its scope (scope is fixed once a thread exists) ----
  let threadId = parsed.data.threadId ?? null;
  let scope: Scope;
  let isNew = false;
  if (threadId) {
    const { data: th } = await db.from("ai_threads").select("id, app_instance_ids").eq("id", threadId).eq("user_id", user.id).maybeSingle();
    if (!th) return new Response(JSON.stringify({ error: "THREAD_NOT_FOUND" }), { status: 404 });
    const { data: sys } = await db.from("ai_messages").select("meta").eq("thread_id", threadId).eq("role", "system").order("created_at").limit(1).maybeSingle();
    scope = readScope(th.app_instance_ids, sys?.meta);
  } else {
    scope = parsed.data.scope ?? { app_instance_ids: [], sheet_ids: [] };
    isNew = true;
  }
  if (!scope.app_instance_ids.length && !scope.sheet_ids.length) {
    return new Response(JSON.stringify({ error: "SCOPE_REQUIRED", message: "Pick at least one app or sheet first." }), { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // 1) create the thread on the first message (title = first 60 chars)
        if (isNew) {
          const title = message.replace(/\s+/g, " ").slice(0, 60);
          const { data: th, error } = await db.from("ai_threads").insert({ user_id: user.id, title, app_instance_ids: scope.app_instance_ids }).select("id").single();
          if (error || !th) throw new Error(error?.message ?? "THREAD_CREATE_FAILED");
          threadId = th.id;
          const { error: sysErr } = await db.from("ai_messages").insert({ thread_id: threadId, user_id: user.id, role: "system", content: "scope", meta: scopeMeta(scope) });
          if (sysErr) throw new Error(sysErr.message);
        }
        const tid = threadId as string;

        // 2) persist the user's message first — it is theirs regardless of what happens next
        const { data: userRow, error: uErr } = await db.from("ai_messages").insert({ thread_id: tid, user_id: user.id, role: "user", content: message }).select("id, role, content, cost_usd, billed_usd, meta, created_at").single();
        if (uErr || !userRow) throw new Error(uErr?.message ?? "MESSAGE_WRITE_FAILED");

        // 3) context (≤ ~6k tokens) + cheap scope check
        send({ status: "reading", detail: "Reading your apps and results" });
        const ctx = await buildThinkTankContext(user.id, scope, message);
        send({ status: "checking", detail: "Checking this is about your apps" });
        const check = await classifyScope(user.id, message, ctx);

        const saveAssistant = async (content: string, costUsd: number, billedUsd: number, meta: Json) => {
          const { data, error } = await db.from("ai_messages").insert({ thread_id: tid, user_id: user.id, role: "assistant", content, cost_usd: costUsd, billed_usd: billedUsd, meta }).select("id, role, content, cost_usd, billed_usd, meta, created_at").single();
          if (error || !data) throw new Error(error?.message ?? "MESSAGE_WRITE_FAILED");
          await db.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", tid);
          return data;
        };

        if (!check.inScope) {
          const assistant = await saveAssistant(offTopicReply(ctx), 0, check.billedUsd, { guardrail: true, how: check.how, reason: check.reason ?? null } as unknown as Json);
          send({ done: true, threadId: tid, user: userRow, assistant, balance: await getBalance(user.id).catch(() => null) });
          return;
        }

        // 4) history (last N turns) + the reply, metered
        const { data: history } = await db.from("ai_messages").select("role, content").eq("thread_id", tid).neq("role", "system").order("created_at", { ascending: false }).limit(HISTORY_LIMIT + 1);
        const turns: ChatMessage[] = (history ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .reverse()
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (!turns.length || turns[turns.length - 1].content !== message) turns.push({ role: "user", content: message });

        const { modelId, isMock } = await routeTask("reasoning");
        const { provider, model } = splitModelId(modelId);
        const messages: ChatMessage[] = [
          { role: "system", content: `${THINKTANK_SYSTEM}\n\nCONTEXT:\n${ctx.text}` },
          ...turns,
        ];
        const est = await estimateCost(provider, model, messages.reduce((n, m) => n + m.content.length, 0), 700);
        send({ status: "thinking", detail: isMock ? "Thinking (offline mode)" : "Thinking", model: modelId });
        const r = await metered({
          userId: user.id, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
          call: async () => {
            const out = await callModel({ model: modelId, messages, temperature: 0.3, maxTokens: 1200 });
            return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
          },
        });
        const content = r.result.text.trim() || "I have nothing to add from what's in scope.";
        const meta = {
          model: modelId, isMock: Boolean(r.result.isMock), contextTokens: ctx.tokens, groundingChunks: ctx.groundingChunks,
          scopeCheck: check.how, suggests: suggestedApps(content, ctx.apps),
        } as unknown as Json;
        const assistant = await saveAssistant(content, r.costUsd, r.billedUsd + check.billedUsd, meta);
        send({ done: true, threadId: tid, user: userRow, assistant, balance: r.balanceAfter });
      } catch (err) {
        if (err instanceof InsufficientCreditError) {
          send({ blocked: true, threadId, message: `Not enough credit (balance $${err.balance.toFixed(2)}). Top up to keep thinking.`, balance: err.balance });
        } else {
          send({ error: true, threadId, message: err instanceof Error ? err.message : String(err) });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
