// Server-only env/secrets access. Provider keys NEVER leave the server (Ground Rule 2).
import "server-only";
import { getSecret } from "./secrets";
export { primeSecrets } from "./secrets";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400",
  graphEngineUrl: process.env.GRAPH_ENGINE_URL ?? "",
  graphEngineSecret: process.env.GRAPH_ENGINE_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  // secrets: vault-first (call primeSecrets() first in async paths), env fallback
  get stripeSecretKey() { return getSecret("STRIPE_SECRET_KEY"); },
  get stripeWebhookSecret() { return getSecret("STRIPE_WEBHOOK_SECRET"); },
  get telegramBotToken() { return getSecret("TELEGRAM_BOT_TOKEN"); },
  get telegramChatId() { return getSecret("TELEGRAM_CHAT_ID"); },
};

/** LLM + tool providers — direct first-party keys only (no aggregators). */
export type Provider =
  | "anthropic" | "openai" | "google" | "groq" | "perplexity" | "deepseek" | "xai" | "mistral"
  | "firecrawl" | "serpapi" | "dataforseo";

const KEY_ENV: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", google: "GOOGLE_API_KEY", groq: "GROQ_API_KEY",
  perplexity: "PERPLEXITY_API_KEY", deepseek: "DEEPSEEK_API_KEY", xai: "XAI_API_KEY", mistral: "MISTRAL_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY", serpapi: "SERPAPI_API_KEY", dataforseo: "DATAFORSEO_API_KEY",
};

export function providerKeyName(provider: Provider) { return KEY_ENV[provider]; }
export function isProvider(p: string): p is Provider { return p in KEY_ENV; }

export function getProviderKey(provider: Provider): string | null {
  const v = getSecret(KEY_ENV[provider]);
  return v.length > 0 ? v : null;
}
export function hasProviderKey(provider: string): boolean {
  return isProvider(provider) && getProviderKey(provider) !== null;
}
