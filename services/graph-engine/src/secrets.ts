import { admin } from './db.js';

/** Vault-first secrets: fills process.env from get_platform_secrets() so embed/aiEdges keep reading env. */
export async function primeSecrets(): Promise<void> {
  try {
    const { data, error } = await admin.rpc('get_platform_secrets');
    if (error) throw error;
    for (const r of (data ?? []) as Array<{ name: string; secret: string }>) {
      if (r.secret && !process.env[`__ENV_${r.name}`]) process.env[r.name] = r.secret;
    }
  } catch (e) {
    console.warn('[secrets] vault read failed, env only:', e instanceof Error ? e.message : e);
  }
}
export function startSecretsRefresh(ms = 5 * 60_000) {
  // remember which names came from the real env so vault never overrides an explicit env value
  for (const n of ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY']) if (process.env[n]) process.env[`__ENV_${n}`] = '1';
  void primeSecrets();
  setInterval(() => void primeSecrets(), ms).unref();
}
