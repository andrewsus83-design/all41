import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { primeSecrets, secretSource, getSecret, mask, SECRET_NAMES } from "@/lib/secrets";
import { PROVIDERS, LLM_PROVIDERS } from "@/lib/ai/providers";
import type { AdminData } from "./admin-client";

/** Load provider keys, routing, cost rates, pricing and benchmark — the Platform-Ops + APIs data. */
export async function loadAdminData(): Promise<AdminData> {
  await primeSecrets(true);
  const db = adminClient();
  const [{ data: routes }, { data: rates }, { data: settings }, { data: bench }] = await Promise.all([
    db.from("routing_weights").select("task_type,model,weight,is_leader,updated_at").order("task_type").order("is_leader", { ascending: false }).order("weight", { ascending: false }),
    db.from("cost_rates").select("api_provider,api_model,input_rate,output_rate,unit,source,updated_at").order("api_provider").order("api_model"),
    db.from("platform_settings").select("key,value"),
    db.from("benchmark_results").select("task_type,model,score,cost_per_run,latency_ms,is_leader,date").order("date", { ascending: false }).limit(200),
  ]);

  const keys = SECRET_NAMES.map((name) => ({ name, source: secretSource(name), masked: mask(getSecret(name)) }));
  const providers = [...LLM_PROVIDERS, "firecrawl", "serpapi", "dataforseo"].map((p) => {
    const spec = PROVIDERS[p as keyof typeof PROVIDERS];
    const keyName = `${p.toUpperCase()}_API_KEY`;
    return {
      id: p, label: spec?.label ?? p, keyName,
      keysUrl: spec?.keysUrl ?? (p === "firecrawl" ? "https://www.firecrawl.dev/app/api-keys" : p === "dataforseo" ? "https://app.dataforseo.com/api-access" : "https://serpapi.com/manage-api-key"),
      suggested: spec?.suggested ?? [], source: secretSource(keyName), masked: mask(getSecret(keyName)),
    };
  });

  return {
    providers,
    otherKeys: keys.filter((k) => !k.name.endsWith("_API_KEY")),
    routes: (routes ?? []).map((r) => ({ ...r, weight: Number(r.weight) })),
    rates: (rates ?? []).map((r) => ({ ...r, input_rate: Number(r.input_rate), output_rate: Number(r.output_rate) })),
    settings: Object.fromEntries((settings ?? []).map((s) => [s.key, Number(s.value)])),
    bench: (bench ?? []).map((b) => ({ ...b, score: Number(b.score), cost_per_run: b.cost_per_run == null ? null : Number(b.cost_per_run) })),
  };
}
