/**
 * Async AI edge pass (/link/ai) — called by the app's Inngest job, never on the request path.
 * Per chunk: vector pre-filter → top-k candidates not from this source → ONE cheap LLM call
 * (OpenRouter llama-3.3-70b) proposing edges + entities. confidence < 0.6 dropped.
 * Entities converge into one `entity` node per (user, lower(name)); chunk → entity `about`.
 * Without OPENROUTER_API_KEY: deterministic mock (top-1 same_topic_as @0.7 if cosine > 0.3,
 * entities = capitalized multi-word phrases), logged at cost 0 so the flow is demonstrable offline.
 */
import { z } from 'zod';
import { admin, assertHasCredit, meterAndDeduct, sumMetered, ZERO, type Metered } from './db.js';
import { cosine, embedMetered, parseVector, toVectorLiteral } from './embed.js';
import { HttpError } from './errors.js';
import { insertEdges } from './link.js';

export const AI_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const RELATIONS = ['about', 'mentions', 'contradicts', 'supports', 'same_topic_as'] as const;
const MIN_CONFIDENCE = 0.6;

const LlmOut = z.object({
  edges: z.array(z.object({ to_index: z.number().int(), relation: z.enum(RELATIONS), confidence: z.number().min(0).max(1) })).default([]),
  entities: z.array(z.object({ name: z.string().min(1).max(120), type: z.string().max(60).default('thing') })).default([]),
});
type LlmOut = z.infer<typeof LlmOut>;
type Candidate = { id: string; title: string | null; content: string; similarity: number };
type ChunkNode = { id: string; title: string | null; content: string; embedding: number[] };

export type AiLinkInput = { user_id: string; source_type: string; source_id: string; k?: number };

export async function aiLink(input: AiLinkInput) {
  const { user_id, source_type, source_id } = input;
  const k = input.k ?? 6;
  const mode: 'ai' | 'mock' = process.env.OPENROUTER_API_KEY ? 'ai' : 'mock';

  const { data: rows, error } = await admin.from('knowledge_nodes').select('id,title,content,embedding,node_type')
    .eq('user_id', user_id).eq('source_type', source_type).eq('source_id', source_id)
    .not('parent_node', 'is', null).order('chunk_index');
  if (error) throw new HttpError(500, `NODES_READ_FAILED: ${error.message}`);
  const chunks: ChunkNode[] = (rows ?? []).flatMap((r) => { const v = parseVector(r.embedding); return v ? [{ id: r.id, title: r.title, content: r.content, embedding: v }] : []; });

  let money: Metered = ZERO;
  let calls = 0, edges_created = 0;
  const edgeRows: Parameters<typeof insertEdges>[0] = [];
  const entityLinks: { chunk: string; name: string; type: string; confidence: number }[] = [];

  for (const chunk of chunks) {
    // pre-filter: similar existing nodes NOT from this source (ask for extra so filtering still leaves k)
    const { data: sim, error: mErr } = await admin.rpc('match_nodes', { p_user_id: user_id, p_query: toVectorLiteral(chunk.embedding), p_k: k + chunks.length + 1 });
    if (mErr) throw new HttpError(500, `MATCH_NODES_FAILED: ${mErr.message}`);
    const cands: Candidate[] = (sim ?? [])
      .filter((s) => !(s.source_type === source_type && s.source_id === source_id) && s.node_type !== 'task')
      .slice(0, k).map((s) => ({ id: s.id, title: s.title, content: s.content, similarity: s.similarity }));

    let out: LlmOut;
    if (mode === 'ai') {
      await assertHasCredit(user_id);
      const r = await callOpenRouter(chunk, cands);
      money = sumMetered(money, await meterAndDeduct({ user_id, provider: 'openrouter', model: AI_MODEL, call_kind: 'graph_edge', input_tokens: r.input_tokens, output_tokens: r.output_tokens, latency_ms: r.latency_ms }));
      out = r.out;
    } else {
      out = mockPass(chunk, cands);
      money = sumMetered(money, await meterAndDeduct({ user_id, provider: 'mock', model: 'mock-edge', call_kind: 'graph_edge', input_tokens: Math.ceil(chunk.content.length / 4), output_tokens: 0, latency_ms: 0 }));
    }
    calls++;
    for (const e of out.edges) {
      const target = cands[e.to_index];
      if (!target || e.confidence < MIN_CONFIDENCE || target.id === chunk.id) continue;
      edgeRows.push({ user_id, from_node: chunk.id, to_node: target.id, relation: e.relation, origin: 'ai', weight: 1.0, confidence: round3(e.confidence) });
    }
    const seen = new Set<string>();
    for (const ent of out.entities) {
      const name = ent.name.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      entityLinks.push({ chunk: chunk.id, name, type: ent.type.trim() || 'thing', confidence: mode === 'ai' ? 0.8 : 0.7 });
    }
  }

  // entities: one node per (user, lower(name)); embed only the new ones in one metered call
  const { idByName, created, metered } = await upsertEntities(user_id, entityLinks.map((e) => ({ name: e.name, type: e.type })));
  money = sumMetered(money, metered);
  for (const l of entityLinks) {
    const to = idByName.get(l.name.toLowerCase());
    if (to) edgeRows.push({ user_id, from_node: l.chunk, to_node: to, relation: 'about', origin: 'ai', weight: 1.0, confidence: l.confidence });
  }
  edges_created = await insertEdges(dedupeEdges(edgeRows));
  return { edges_created, entities_created: created, calls, cost_usd: money.cost_usd, billed_usd: money.billed_usd, mode };
}

// --- helpers ----------------------------------------------------------------
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const dedupeEdges = <T extends { from_node: string; to_node: string; relation: string }>(rows: T[]) => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(`${r.from_node}|${r.to_node}|${r.relation}`, r);
  return [...m.values()];
};

async function upsertEntities(user_id: string, ents: { name: string; type: string }[]) {
  const idByName = new Map<string, string>();
  const wanted = new Map<string, { name: string; type: string }>();
  for (const e of ents) if (!wanted.has(e.name.toLowerCase())) wanted.set(e.name.toLowerCase(), e);
  if (wanted.size === 0) return { idByName, created: 0, metered: ZERO };

  const { data: existing, error } = await admin.from('knowledge_nodes').select('id,title').eq('user_id', user_id).eq('node_type', 'entity');
  if (error) throw new HttpError(500, `ENTITY_READ_FAILED: ${error.message}`);
  for (const e of existing ?? []) if (e.title) idByName.set(e.title.toLowerCase(), e.id);

  const fresh = [...wanted.values()].filter((e) => !idByName.has(e.name.toLowerCase()));
  if (fresh.length === 0) return { idByName, created: 0, metered: ZERO };
  const { vectors, metered } = await embedMetered(user_id, fresh.map((e) => `${e.name} (${e.type})`));
  let created = 0;
  for (let i = 0; i < fresh.length; i++) {
    const e = fresh[i];
    const { data, error: iErr } = await admin.from('knowledge_nodes').insert({
      user_id, node_type: 'entity', title: e.name, content: `${e.name} (${e.type})`, entities: [e.name], tags: [e.type],
      token_count: Math.ceil((e.name.length + e.type.length + 3) / 4), embedding: toVectorLiteral(vectors[i]),
    }).select('id').single();
    if (data) { idByName.set(e.name.toLowerCase(), data.id); created++; continue; }
    // unique (user_id, lower(title)) race → read the winner
    const { data: again } = await admin.from('knowledge_nodes').select('id').eq('user_id', user_id).eq('node_type', 'entity').ilike('title', escapeLike(e.name)).maybeSingle();
    if (again) idByName.set(e.name.toLowerCase(), again.id);
    else throw new HttpError(500, `ENTITY_INSERT_FAILED: ${iErr?.message}`);
  }
  return { idByName, created, metered };
}
const escapeLike = (s: string) => s.replace(/[%_\\]/g, (c) => `\\${c}`);

function mockPass(chunk: ChunkNode, cands: Candidate[]): LlmOut {
  const edges: LlmOut['edges'] = [];
  if (cands.length && cands[0].similarity > 0.3) edges.push({ to_index: 0, relation: 'same_topic_as', confidence: 0.7 });
  const names = new Set<string>();
  for (const m of chunk.content.matchAll(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)+)\b/g)) { names.add(m[1]); if (names.size >= 5) break; }
  return { edges, entities: [...names].map((name) => ({ name, type: 'thing' })) };
}

async function callOpenRouter(chunk: ChunkNode, cands: Candidate[]) {
  const t0 = Date.now();
  const candList = cands.map((c, i) => `[${i}] ${c.title ?? '(untitled)'}: ${c.content.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n');
  const prompt = `You link a knowledge graph. Given the NEW chunk and CANDIDATE nodes, return JSON only:
{"edges":[{"to_index":<candidate index>,"relation":"about|mentions|contradicts|supports|same_topic_as","confidence":0-1}],
 "entities":[{"name":"<proper noun / product / company / person>","type":"company|product|person|place|concept"}]}
Only propose edges you are confident about (≥0.6). Max 5 edges, max 6 entities.

NEW CHUNK (${chunk.title ?? 'untitled'}):
${chunk.content.slice(0, 2400)}

CANDIDATES:
${candList || '(none)'}`;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new HttpError(502, `OPENROUTER_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const text = data.choices?.[0]?.message?.content ?? '{}';
  let parsed: unknown = {};
  try { parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch { /* unparseable → no edges */ }
  const out = LlmOut.safeParse(parsed);
  return { out: out.success ? out.data : { edges: [], entities: [] }, input_tokens: data.usage?.prompt_tokens ?? 0, output_tokens: data.usage?.completion_tokens ?? 0, latency_ms: Date.now() - t0 };
}
