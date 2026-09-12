import { assertHasCredit, meterAndDeduct, type Metered } from './db.js';
import { HttpError } from './errors.js';

export const EMBED_DIM = 1536;
export const EMBED_MODEL = 'text-embedding-3-small';

export const embeddingsMode = (): 'openai' | 'mock' => (process.env.OPENAI_API_KEY ? 'openai' : 'mock');

/** Bag-of-hashed-words vector, L2-normalized. MUST stay bit-identical to apps/web/src/lib/ai/embed.ts. */
export function pseudoEmbed(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2)) {
    let h = 2166136261;
    for (let i = 0; i < w.length; i++) h = Math.imul(h ^ w.charCodeAt(i), 16777619);
    v[Math.abs(h) % EMBED_DIM] += 1;
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

type EmbedResult = { vectors: number[][]; inputTokens: number; provider: string; model: string; latency_ms: number };

async function embedTexts(texts: string[]): Promise<EmbedResult> {
  const t0 = Date.now();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { vectors: texts.map(pseudoEmbed), inputTokens: texts.reduce((n, t) => n + estimateTokens(t), 0), provider: 'mock', model: 'mock-embed', latency_ms: Date.now() - t0 };
  }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new HttpError(502, `OPENAI_EMBED_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { data: { embedding: number[] }[]; usage?: { prompt_tokens?: number } };
  return { vectors: data.data.map((d) => d.embedding), inputTokens: data.usage?.prompt_tokens ?? 0, provider: 'openai', model: EMBED_MODEL, latency_ms: Date.now() - t0 };
}

/** One batched embedding call, metered to the user and deducted. Zero-credit users pass only when embeddings are mock (cost 0). */
export async function embedMetered(user_id: string, texts: string[], task_id?: string | null): Promise<{ vectors: number[][]; metered: Metered }> {
  if (texts.length === 0) return { vectors: [], metered: { cost_usd: 0, billed_usd: 0 } };
  if (embeddingsMode() === 'openai') await assertHasCredit(user_id);
  const r = await embedTexts(texts);
  const metered = await meterAndDeduct({ user_id, task_id, provider: r.provider, model: r.model, call_kind: 'embedding', input_tokens: r.inputTokens, latency_ms: r.latency_ms });
  return { vectors: r.vectors, metered };
}

// --- vector helpers ----------------------------------------------------------
export const toVectorLiteral = (v: number[]) => JSON.stringify(v);
/** pgvector comes back through PostgREST as the string "[0.1,0.2,...]". */
export function parseVector(s: string | null | undefined): number[] | null {
  if (!s) return null;
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(Number) : null; } catch { return null; }
}
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}
