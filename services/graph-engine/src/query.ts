/**
 * Two-stage grounding retrieval (spec §5):
 *   1. embed query (metered) → match_nodes seeds
 *   2. graph_expand ≤ hops from seeds (limit 60) → fetch those nodes + embeddings
 *   score = path_weight × cosine(query, node) × recency → rank → greedy fill under token_budget.
 * Nodes without an embedding (task hubs) are never returned as context.
 */
import { admin } from './db.js';
import { cosine, embedMetered, parseVector, toVectorLiteral } from './embed.js';
import { HttpError } from './errors.js';
import { fillBudget, rank, type Candidate } from './rank.js';

export type QueryInput = { user_id: string; query: string; k?: number; hops?: number; token_budget?: number; types?: string[] | null };
const EXPAND_LIMIT = 60;

export async function queryGraph(q: QueryInput) {
  const k = q.k ?? 8, hops = Math.min(q.hops ?? 2, 2), budget = q.token_budget ?? 6000;
  const { vectors, metered } = await embedMetered(q.user_id, [q.query]);
  const qv = vectors[0];
  const money = { cost_usd: metered.cost_usd, billed_usd: metered.billed_usd };

  const { data: seeds, error: sErr } = await admin.rpc('match_nodes', { p_user_id: q.user_id, p_query: toVectorLiteral(qv), p_k: k, p_types: q.types ?? undefined });
  if (sErr) throw new HttpError(500, `MATCH_NODES_FAILED: ${sErr.message}`);
  if (!seeds || seeds.length === 0) return { chunks: [], token_count: 0, seeds: 0, expanded: 0, ...money };

  const cands: Candidate[] = seeds.map((s) => ({
    id: s.id, title: s.title, content: s.content, node_type: s.node_type, similarity: Math.max(0, s.similarity),
    hop: 0, via: null, path_weight: 1, token_count: s.token_count ?? Math.ceil(s.content.length / 4), created_at: s.created_at,
  }));

  let expandedCount = 0;
  if (hops > 0) {
    const seedIds = seeds.map((s) => s.id);
    const { data: exp, error: eErr } = await admin.rpc('graph_expand', { p_user_id: q.user_id, p_seed_ids: seedIds, p_hops: hops, p_limit: EXPAND_LIMIT });
    if (eErr) throw new HttpError(500, `GRAPH_EXPAND_FAILED: ${eErr.message}`);
    const byId = new Map((exp ?? []).map((e) => [e.id, e]));
    if (byId.size) {
      const { data: nodes, error: nErr } = await admin.from('knowledge_nodes')
        .select('id,title,content,node_type,token_count,created_at,embedding')
        .eq('user_id', q.user_id).in('id', [...byId.keys()]);
      if (nErr) throw new HttpError(500, `NODES_READ_FAILED: ${nErr.message}`);
      for (const n of nodes ?? []) {
        const v = parseVector(n.embedding);
        if (!v) continue;
        const e = byId.get(n.id)!;
        expandedCount++;
        cands.push({
          id: n.id, title: n.title, content: n.content, node_type: n.node_type, similarity: Math.max(0, cosine(qv, v)),
          hop: e.hop, via: e.via_relation, path_weight: Number(e.path_weight), token_count: n.token_count ?? Math.ceil(n.content.length / 4), created_at: n.created_at,
        });
      }
    }
  }

  const { picked, tokens } = fillBudget(rank(cands), budget);
  return {
    chunks: picked.map((c) => ({ id: c.id, title: c.title, content: c.content, node_type: c.node_type, similarity: round(c.similarity), hop: c.hop, via: c.via, score: round(c.score), token_count: c.token_count })),
    token_count: tokens,
    seeds: seeds.length,
    expanded: expandedCount,
    ...money,
  };
}
const round = (n: number) => Math.round(n * 1e4) / 1e4;
