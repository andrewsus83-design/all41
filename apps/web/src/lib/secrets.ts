import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Platform secrets (Task 0.5): Supabase Vault first, process.env fallback.
 * Loaded into an in-memory cache (60s TTL); sync readers call getSecret() after primeSecrets().
 */
export const SECRET_NAMES = [
  "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY", "PERPLEXITY_API_KEY",
  "DEEPSEEK_API_KEY", "XAI_API_KEY", "MISTRAL_API_KEY",
  "FIRECRAWL_API_KEY", "SERPAPI_API_KEY", "DATAFORSEO_API_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
  "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY",
] as const;
export type SecretName = (typeof SECRET_NAMES)[number];

let cache: { at: number; map: Map<string, string> } | null = null;
const TTL = 60_000;

export async function primeSecrets(force = false): Promise<void> {
  if (!force && cache && Date.now() - cache.at < TTL) return;
  try {
    const { data, error } = await adminClient().rpc("get_platform_secrets");
    if (error) throw error;
    const map = new Map<string, string>();
    for (const r of (data ?? []) as Array<{ name: string; secret: string }>) if (r.secret) map.set(r.name, r.secret);
    cache = { at: Date.now(), map };
  } catch (e) {
    console.warn("[secrets] vault read failed, using env only:", e instanceof Error ? e.message : e);
    cache = { at: Date.now(), map: cache?.map ?? new Map() };
  }
}

/** Sync read: vault cache → env → "". */
export function getSecret(name: string): string {
  return cache?.map.get(name) ?? process.env[name] ?? "";
}

export function secretSource(name: string): "vault" | "env" | "unset" {
  if (cache?.map.get(name)) return "vault";
  if (process.env[name]) return "env";
  return "unset";
}

export async function setSecret(name: SecretName, value: string) {
  const { error } = await adminClient().rpc("set_platform_secret", { p_name: name, p_value: value.trim() });
  if (error) throw new Error(error.message);
  await primeSecrets(true);
}

export async function deleteSecret(name: SecretName) {
  const { error } = await adminClient().rpc("delete_platform_secret", { p_name: name });
  if (error) throw new Error(error.message);
  await primeSecrets(true);
}

export function mask(v: string) {
  return v ? `${v.slice(0, 4)}…${v.slice(-4)}` : "";
}
