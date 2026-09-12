/** Scoring + token-budget packing for /query. Pure, unit-tested. */
export type Candidate = {
  id: string;
  title: string | null;
  content: string;
  node_type: string;
  similarity: number;   // cosine, clamped ≥ 0
  hop: number;          // 0 = seed
  via: string | null;   // relation that reached it (expanded only)
  path_weight: number;  // 1.0 for seeds
  token_count: number;
  created_at: string;
};
export type Ranked = Candidate & { score: number };

/** 1.0 for < 7 days old, linear decay to 0.6 at 90 days, flat after. */
export function recencyFactor(createdAt: string, now = Date.now()): number {
  const days = Math.max(0, (now - new Date(createdAt).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days <= 7) return 1;
  if (days >= 90) return 0.6;
  return 1 - 0.4 * ((days - 7) / 83);
}

export function score(c: Candidate, now = Date.now()): number {
  return c.path_weight * Math.max(0, c.similarity) * recencyFactor(c.created_at, now);
}

/** De-duplicate by id (keep the higher score), drop zero-score candidates (no relevance to the query), sort descending. */
export function rank(cands: Candidate[], now = Date.now()): Ranked[] {
  const best = new Map<string, Ranked>();
  for (const c of cands) {
    const s = score(c, now);
    if (s <= 0) continue;
    const prev = best.get(c.id);
    if (!prev || s > prev.score) best.set(c.id, { ...c, score: s });
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.hop - b.hop);
}

/**
 * Greedy fill: walk ranked candidates, take each one that still fits under the budget,
 * skip those that don't (a smaller lower-ranked chunk may still fit). Total NEVER exceeds budget.
 */
export function fillBudget<T extends { token_count: number }>(ranked: T[], budget: number): { picked: T[]; tokens: number } {
  const picked: T[] = [];
  let tokens = 0;
  for (const c of ranked) {
    const tc = Math.max(0, c.token_count | 0);
    if (tokens + tc > budget) continue;
    picked.push(c);
    tokens += tc;
  }
  return { picked, tokens };
}
