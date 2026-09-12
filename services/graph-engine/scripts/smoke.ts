/**
 * End-to-end smoke against a running graph-engine (default http://localhost:3401).
 * Ingests two related docs for the credited test user, re-ingests one (idempotency), ingests
 * for the ZERO-credit user (must pass when embeddings are mock → cost 0), runs /link/ai,
 * /query, /graph and /node. Exits non-zero on any failed assertion.
 */
import '../src/env.js';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.GRAPH_ENGINE_URL ?? `http://localhost:${process.env.PORT ?? 3401}`;
const SECRET = process.env.GRAPH_ENGINE_SECRET!;
const USER = '11111111-1111-1111-1111-111111111111';       // has credit
const USER_ZERO = '22222222-2222-2222-2222-222222222222';  // zero credit
const FILE_A = 'a0000000-0000-4000-8000-00000000000a';
const TASK_T = 'a0000000-0000-4000-8000-00000000000b';
const FILE_Z = 'a0000000-0000-4000-8000-00000000000c';

let failures = 0;
const check = (cond: unknown, msg: string) => { if (!cond) { failures++; console.error('  FAIL:', msg); } else console.log('  ok  :', msg); };

async function call<T = any>(method: string, path: string, body?: unknown, auth = true): Promise<{ status: number; json: T }> {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${SECRET}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as T };
}

const DOC_A = `# Jasper AI competitor crawl

Jasper AI is an AI copywriting platform aimed at marketing teams. Jasper AI sells three tiers: Creator, Pro and Business.
The Creator tier costs $39 per month per seat and includes one brand voice and 50 memories.

## Pricing table

Pro is $59 per month per seat with three brand voices, ten knowledge assets and collaboration features.
Business pricing is custom and includes Jasper API access, enterprise security and a dedicated account manager.
Jasper AI raised prices in 2023 and again in 2024; the Creator tier used to be $29.

## Features

Jasper Chat, Jasper Art and the Chrome Extension are bundled at every tier. Brand Voice lets a team upload style guides.
Jasper Campaigns orchestrates multi-channel content from a single brief. Competitors include Copy AI and Writesonic.
`;

const DOC_B = `# Competitor report: Jasper AI vs all41

Summary: Jasper AI charges $39-$59 per seat per month while all41 charges per task with no seat fee.
For a five-person marketing team Jasper AI costs roughly $295 per month before usage; all41 pricing scales with tasks executed.

Threats: Jasper AI has strong Brand Voice tooling and a mature Chrome Extension. Copy AI undercuts on price.
Opportunities: all41 grounds every answer in the user's own files via the knowledge graph, which Jasper AI does not offer.

Recommended next move: publish a pricing comparison page targeting Jasper AI Creator tier customers.
`;

async function fixtures() {
  // api_usage_log.task_id → tasks(id) and user_id → auth.users(id) are real FKs: the task must exist, users must be real.
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { error } = await sb.from('tasks').upsert({ id: TASK_T, user_id: USER, task_type: 'research', status: 'done', briefing: { what: 'smoke' } }, { onConflict: 'id' });
  if (error) throw new Error(`fixture task: ${error.message}`);
  const { error: dErr } = await sb.from('knowledge_nodes').delete().eq('user_id', USER_ZERO);
  if (dErr) throw new Error(`fixture clear zero user: ${dErr.message}`);
}

async function main() {
  console.log(`smoke → ${BASE}`);
  await fixtures();

  console.log('\n[health]');
  const h = await call('GET', '/health', undefined, false);
  check(h.status === 200 && h.json.ok === true, `GET /health 200 (embeddings=${h.json.embeddings})`);
  const mock = h.json.embeddings === 'mock';

  console.log('\n[auth]');
  const un = await call('GET', `/graph?user_id=${USER}`, undefined, false);
  check(un.status === 401, 'missing bearer → 401');
  const bad = await call('POST', '/ingest', { user_id: 'nope' });
  check(bad.status === 400 && typeof bad.json.error === 'string', 'invalid body → 400 {error}');

  console.log('\n[ingest A (file, uploaded in task T)]');
  const a1 = await call('POST', '/ingest', { user_id: USER, source_type: 'file', source_id: FILE_A, task_id: TASK_T, title: 'jasper-crawl.md', content: DOC_A, mime: 'text/markdown' });
  check(a1.status === 200, `ingest A → 200 (${JSON.stringify(a1.json).slice(0, 160)})`);
  check(a1.json.chunks >= 1 && a1.json.node_ids?.length === a1.json.chunks, `A chunks=${a1.json.chunks}`);
  check(a1.json.edges_created > 0, `A edges_created=${a1.json.edges_created}`);
  const a2 = await call('POST', '/ingest', { user_id: USER, source_type: 'file', source_id: FILE_A, task_id: TASK_T, title: 'jasper-crawl.md', content: DOC_A, mime: 'text/markdown' });
  check(a2.status === 200 && a2.json.chunks === a1.json.chunks && a2.json.document_id !== a1.json.document_id, 're-ingest A replaces (same chunk count, new document id)');

  console.log('\n[ingest B (task output, derived_from A)]');
  const b = await call('POST', '/ingest', { user_id: USER, source_type: 'task', source_id: TASK_T, title: 'Competitor report', content: DOC_B, derived_from_source_ids: [FILE_A] });
  check(b.status === 200 && b.json.chunks >= 1, `ingest B → 200 chunks=${b.json.chunks} edges=${b.json.edges_created}`);

  console.log('\n[node detail: B document should show derived_from + produced_by]');
  const nd = await call('GET', `/node/${b.json.document_id}?user_id=${USER}`);
  const rels = (nd.json.edges ?? []).map((e: any) => e.relation).sort();
  check(nd.status === 200 && rels.includes('derived_from') && rels.includes('produced_by') && rels.includes('part_of'), `B doc edges: ${rels.join(',')}`);

  console.log('\n[ZERO-credit user: empty graph query, then ingest]');
  const qe = await call('POST', '/query', { user_id: USER_ZERO, query: 'anything at all' });
  check(qe.status === 200 && qe.json.chunks.length === 0 && qe.json.token_count === 0, 'empty graph → 200 {chunks:[],token_count:0}');
  const z = await call('POST', '/ingest', { user_id: USER_ZERO, source_type: 'manual', source_id: FILE_Z, title: 'note', content: 'A short note about Jasper AI pricing for a zero credit user.' });
  if (mock) check(z.status === 200 && z.json.billed_usd === 0, `mock embeddings → zero-credit ingest passes, billed_usd=${z.json.billed_usd}`);
  else check(z.status === 402, `real embeddings → zero-credit ingest rejected with 402 (got ${z.status})`);

  console.log('\n[link/ai]');
  const ai = await call('POST', '/link/ai', { user_id: USER, source_type: 'file', source_id: FILE_A, k: 6 });
  check(ai.status === 200, `link/ai → 200 mode=${ai.json.mode} calls=${ai.json.calls} edges=${ai.json.edges_created} entities=${ai.json.entities_created} cost=${ai.json.cost_usd}`);
  check(ai.json.calls === a1.json.chunks, 'one LLM call per chunk');
  const ai2 = await call('POST', '/link/ai', { user_id: USER, source_type: 'file', source_id: FILE_A, k: 6 });
  check(ai2.status === 200 && ai2.json.entities_created === 0, 're-running link/ai creates no duplicate entities');

  console.log('\n[query]');
  const q = await call('POST', '/query', { user_id: USER, query: 'How much does Jasper AI charge per seat and how does that compare to all41?', k: 6, hops: 2, token_budget: 900 });
  check(q.status === 200, `query → 200 seeds=${q.json.seeds} expanded=${q.json.expanded} chunks=${q.json.chunks?.length} token_count=${q.json.token_count}`);
  check(q.json.token_count <= 900, 'token_count within budget (900)');
  check((q.json.chunks ?? []).some((c: any) => c.hop > 0), 'result includes graph-expanded (hop>0) chunks');
  for (const c of q.json.chunks ?? []) console.log(`    hop=${c.hop} via=${c.via ?? '-'} score=${c.score} sim=${c.similarity} tok=${c.token_count} [${c.node_type}] ${c.title}`);

  console.log('\n[graph]');
  const g = await call('GET', `/graph?user_id=${USER}&limit=100`);
  check(g.status === 200 && g.json.nodes.length > 0 && g.json.edges.length > 0, `graph nodes=${g.json.nodes?.length} edges=${g.json.edges?.length}`);
  const types = [...new Set(g.json.nodes.map((n: any) => n.node_type))].sort();
  console.log('    node types:', types.join(','), '| edge relations:', [...new Set(g.json.edges.map((e: any) => e.relation))].sort().join(','));
  const gf = await call('GET', `/graph?user_id=${USER}&focus=${b.json.document_id}`);
  check(gf.status === 200 && gf.json.nodes.some((n: any) => n.id === b.json.document_id), `graph focus → ${gf.json.nodes?.length} nodes / ${gf.json.edges?.length} edges`);

  console.log(`\nSUMMARY: A chunks=${a1.json.chunks} B chunks=${b.json.chunks} det-edges=${a1.json.edges_created + b.json.edges_created} ai-edges=${ai.json.edges_created} entities=${ai.json.entities_created} query chunks=${q.json.chunks.length} token_count=${q.json.token_count}/900 graph=${g.json.nodes.length}n/${g.json.edges.length}e`);
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
