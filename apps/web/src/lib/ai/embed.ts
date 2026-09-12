import "server-only";
import { getProviderKey, primeSecrets } from "@/lib/env";

export const EMBED_DIM = 1536;
export const EMBED_MODEL = "text-embedding-3-small";

/** Embeds texts. Real: OpenAI text-embedding-3-small. No key: deterministic pseudo-embeddings so the graph works offline. */
export async function embedTexts(texts: string[]): Promise<{ vectors: number[][]; inputTokens: number; provider: string; model: string; isMock: boolean }> {
  await primeSecrets();
  const key = getProviderKey("openai");
  if (!key) {
    return { vectors: texts.map(pseudoEmbed), inputTokens: texts.reduce((n, t) => n + Math.ceil(t.length / 4), 0), provider: "mock", model: "mock-embed", isMock: true };
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`OPENAI_EMBED_${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    vectors: data.data.map((d: { embedding: number[] }) => d.embedding),
    inputTokens: data.usage?.prompt_tokens ?? 0,
    provider: "openai", model: EMBED_MODEL, isMock: false,
  };
}

/** Bag-of-hashed-words vector, L2-normalized — similar texts land near each other. Dev only. */
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
