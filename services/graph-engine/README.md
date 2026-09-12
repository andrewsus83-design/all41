# all41 Graph Engine

The one separate service in the all41 stack (spec: `docs/GRAPH_ENGINE_SPEC.md`). Turns files, task outputs and notes into a per-user knowledge graph in Supabase (`knowledge_nodes` / `knowledge_edges`, pgvector) and serves two-stage, token-budgeted grounding context back to the app.

- Hono + `@hono/node-server`, TypeScript ESM, port **3401**
- Every embedding / AI-edge call is **metered** to `api_usage_log` and **deducted** from the user's credit (`credit_apply`). `billed = cost × markup × (1 + platform_fee)` from `cost_rates` + `platform_settings`. Billed 0 (mock) → no deduction. A failed usage-log write fails the request.
- With no `OPENAI_API_KEY` the service uses the deterministic `pseudoEmbed` (bit-identical to `apps/web/src/lib/ai/embed.ts`) so dev works with zero keys; with no `OPENROUTER_API_KEY` `/link/ai` runs a deterministic mock pass.

## Env

| var | required | notes |
|---|---|---|
| `PORT` | no | default 3401 |
| `SUPABASE_URL` | yes | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | service role (bypasses RLS — every query scopes `user_id` explicitly) |
| `GRAPH_ENGINE_SECRET` | yes | shared bearer secret; the app sends `Authorization: Bearer <secret>` |
| `OPENAI_API_KEY` | no | real `text-embedding-3-small` embeddings; empty → mock (provider `mock`, cost 0) |
| `OPENROUTER_API_KEY` | no | real AI edges via `meta-llama/llama-3.3-70b-instruct`; empty → mock pass |

`.env` is loaded only in dev (`src/env.ts`); production reads the container environment.

## Endpoints

All except `/health` require `Authorization: Bearer <GRAPH_ENGINE_SECRET>`. JSON in/out; bad input → `4xx {error}`; insufficient credit → `402 {error:"INSUFFICIENT_CREDIT"}`.

| method | path | body / query | returns |
|---|---|---|---|
| GET | `/health` | – | `{ok, service, embeddings:'openai'\|'mock'}` |
| POST | `/ingest` | `{user_id, source_type:'file'\|'task'\|'app_instance'\|'manual', source_id, title, content, node_type?, task_id?, derived_from_source_ids?, mime?}` | `{document_id, node_ids, chunks, edges_created, cost_usd, billed_usd, embeddings}` |
| POST | `/link` | `{user_id, source_type, source_id, task_id?, derived_from_source_ids?}` | `{edges_created, document_id}` — rebuilds deterministic edges |
| POST | `/link/ai` | `{user_id, source_type, source_id, k?=6}` | `{edges_created, entities_created, calls, cost_usd, billed_usd, mode:'ai'\|'mock'}` — async job only |
| POST | `/query` | `{user_id, query, k?=8, hops?=2, token_budget?=6000, types?}` | `{chunks:[{id,title,content,node_type,similarity,hop,via,score,token_count}], token_count, seeds, expanded, cost_usd, billed_usd}` |
| GET | `/graph` | `?user_id=&focus=&limit=300` | `{nodes:[{id,title,node_type,degree,source_type,source_id,created_at}], edges:[{id,from,to,relation,origin,weight,confidence}]}` |
| GET | `/node/:id` | `?user_id=` | node content + its edges with neighbor titles |

### Ingest semantics
1. Idempotent: existing nodes for `(user_id, source_type, source_id)` are deleted (edges cascade) — except the task hub — so re-ingest replaces. Embedding (and any 402) happens **before** the delete, so a failed re-ingest leaves the old graph intact.
2. One parent `document` node (content = ~300-char summary) + section-level chunks (`src/chunk.ts`: markdown headings → sections, paragraphs merged to ≤500 tokens, ≥200 where possible, hard-split when needed; tokens ≈ chars/4).
3. One batched embedding call, metered. Default `node_type`: file→`file_chunk`, task→`task_output`, app_instance→`app_result`, manual→`note`. For `source_type='task'`, `task_id` defaults to `source_id`.
4. Deterministic link (below), synchronous, zero cost.

### Deterministic edges (`/link`, `src/link.ts`)
| relation | rule | weight |
|---|---|---|
| `part_of` | chunk → document | 1.0 |
| `sibling_of` | chunk[i] → chunk[i+1] | 0.6 |
| `derived_from` | document → document node of each `derived_from_source_ids` | 1.0 |
| `uploaded_in` | `source_type='file'` + `task_id`: chunks and document → **task hub** | 1.0 |
| `produced_by` | other source types + `task_id`: document → **task hub** | 1.0 |

**Task hub** = one node per (user, task): `node_type 'task'`, `source_type 'task'`, `source_id = task_id`, no embedding (never a seed, only reached by expansion; never returned as context). Files uploaded in a task and the task's own output meet at the hub within 2 hops.

### Query (`src/query.ts`, `src/rank.ts`)
embed query (metered) → `match_nodes` seeds (top-k) → `graph_expand` ≤2 hops, limit 60 → `score = path_weight × cosine(query, node) × recency` (1.0 under 7 days → 0.6 at 90 days) → de-dup, drop zero-score, sort → greedy fill under `token_budget` (an item that doesn't fit is skipped; the total **never** exceeds the budget). Empty graph → `200 {chunks:[], token_count:0}`.

### AI edges (`/link/ai`, `src/aiEdges.ts`)
Per chunk: `match_nodes` with the chunk's own embedding → top-k candidates not from this source → ONE OpenRouter call (`meta-llama/llama-3.3-70b-instruct`, JSON) proposing `edges[{to_index, relation, confidence}]` + `entities[{name,type}]`. Confidence < 0.6 dropped. Entities become one `entity` node per (user, lower(name)) (embedded, metered) linked chunk → entity `about`. Each LLM call is metered (`call_kind 'graph_edge'`). Mock mode: top-1 candidate `same_topic_as` @0.7 if cosine > 0.3; entities = capitalized multi-word phrases; logged with provider `mock`, cost 0.

## Run locally
```sh
cp .env.example .env   # fill SUPABASE_SERVICE_ROLE_KEY
pnpm dev               # tsx watch, :3401
pnpm smoke             # end-to-end against the running server (needs the two test users in the DB)
pnpm test && pnpm typecheck
```

## Deploy on Coolify (VPS)
1. Push the repo; in Coolify **New Resource → Application → Git repository**.
2. Build Pack **Dockerfile**; **Base Directory** `/`; **Dockerfile Location** `/services/graph-engine/Dockerfile` (the image is built from the monorepo root so the pnpm workspace + lockfile resolve).
3. **Port** 3401 (exposed; health check `GET /health`).
4. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GRAPH_ENGINE_SECRET` (mark as secret), optionally `OPENAI_API_KEY`, `OPENROUTER_API_KEY`. `PORT` defaults to 3401.
5. Attach a domain (e.g. `graph.all41.xyz`) with Coolify's automatic TLS, or keep it internal and reach it from Vercel over the public URL with the bearer secret only.
6. Set `GRAPH_ENGINE_URL` + `GRAPH_ENGINE_SECRET` on the web app (Vercel) to point at it.
7. Requires migration `supabase/migrations/20260912000004_graph_engine.sql` (mock cost-rate rows) to be pushed; the engine also tolerates their absence by pricing provider `mock` at 0.
