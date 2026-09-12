// Server-only env access. Provider keys NEVER leave the server (Ground Rule 2).
import "server-only";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3400",
  graphEngineUrl: process.env.GRAPH_ENGINE_URL ?? "",
  graphEngineSecret: process.env.GRAPH_ENGINE_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
};

/**
 * Provider key vault (Task 0.5). Keys are read from server env — on Vercel these are
 * encrypted at rest and injected at runtime; locally from .env.local (gitignored).
 * Migration path to Supabase Vault: swap the body of this function for a
 * `select decrypted_secret from vault.decrypted_secrets where name = $1` via the admin client.
 */
export type Provider =
  | "openrouter"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "firecrawl"
  | "serpapi";

const KEY_ENV: Record<Provider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  firecrawl: "FIRECRAWL_API_KEY",
  serpapi: "SERPAPI_API_KEY",
};

export function getProviderKey(provider: Provider): string | null {
  const v = process.env[KEY_ENV[provider]];
  return v && v.length > 0 ? v : null;
}

export function hasProviderKey(provider: Provider): boolean {
  return getProviderKey(provider) !== null;
}
