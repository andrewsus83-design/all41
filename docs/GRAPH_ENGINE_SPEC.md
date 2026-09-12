# all41 — Graph Engine Specification (Obsidian-style Context Layer)

**Version 1.0 · Companion to Master Plan v1.1**
**Decision: modular monolith + graph engine as ONE separate service · hybrid edges · per-user full graph · chunked (section-level) nodes**

> The graph engine is what makes all41's context *sharp*. It turns a user's scattered files, outputs, and notes into a connected knowledge graph the AI reasons over — the Obsidian model, applied to an AI work engine.

---

## 1. Why this exists

Vector search alone answers "what's *similar* to this question?" A knowledge graph answers "what's *connected* to this thing?" — which is a sharper question for grounding. When a user asks about competitor Jasper AI, the graph returns not just semantically-similar chunks, but everything explicitly linked: the crawl it came from, the pricing table it was compared against, the meeting note that mentioned it. That connected context is what makes the AI's answer precise instead of vague.

The graph is the anti-hallucination grounding layer (layer 3 in the Master Plan), upgraded from flat pgvector to a connected node+edge structure.

---

## 2. Architecture: where the graph engine sits

Not full microservices (a trap for a solo dev). Instead: a **modular monolith** for the app, with the graph engine as the **one** service worth separating — because graph ingestion and edge-building are CPU/token-heavy and benefit from scaling independently.

```
┌─────────────────────────────────────────────┐
│  all41 app  (Next.js modular monolith, Vercel)│
│  ├── chat + briefing                          │
│  ├── billing + credit ledger                  │
│  ├── model router  ← built from day one       │
│  └── mini apps                                │
└───────────────┬─────────────────────────────┘
                │  HTTP (internal API)
                ▼
┌─────────────────────────────────────────────┐
│  Graph Engine  (one service, VPS + Coolify)   │
│  ├── /ingest      chunk → embed → node        │
│  ├── /link        build edges (hybrid)        │
│  ├── /query       retrieve connected context  │
│  └── /graph       return nodes+edges for UI   │
└───────────────┬─────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│  Supabase Postgres + pgvector                 │
│  knowledge_nodes · knowledge_edges (RLS)      │
└─────────────────────────────────────────────┘
```

**Why separate:** the graph engine can be rewritten, scaled, or swapped (e.g. to LightRAG later) without touching the app. It runs the heavy ingestion/embedding work off the request path. But it's ONE service — not ten — so operational load stays manageable for a solo builder.

**The model router is in the monolith, built from the start** — it's a request-path concern (every task routes), not a heavy background job, so it belongs with the app, not as a separate service.

---

## 3. Data model

### 3.1 Nodes — chunked, section-level granularity

One file/output is NOT one node. It's split into section-level chunks (like RAG chunking), because fine granularity means the graph returns the *exact relevant passage*, not a whole document the AI has to wade through. Each chunk is a node.

```sql
create table public.knowledge_nodes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,

  -- Content
  title         text,                    -- section heading or generated label
  content       text not null,           -- the chunk itself (~200-500 tokens)
  chunk_index   int,                     -- position within its source
  node_type     text not null,           -- 'file_chunk' | 'task_output' | 'note'
                                         -- | 'entity' | 'contact' | 'app_result'

  -- Provenance (which source this chunk came from)
  source_type   text,                    -- 'file' | 'task' | 'app_instance' | 'manual'
  source_id     uuid,                    -- FK to files / tasks / user_app_instances
  parent_node   uuid references public.knowledge_nodes,  -- the "document" node, if chunked

  -- Retrieval
  embedding     vector(1536),            -- pgvector, for semantic recall
  tags          text[],
  entities      text[],                  -- extracted named entities (for entity nodes)

  -- Meta
  token_count   int,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_nodes_user      on knowledge_nodes (user_id);
create index idx_nodes_embedding on knowledge_nodes using hnsw (embedding vector_cosine_ops);
create index idx_nodes_source    on knowledge_nodes (source_type, source_id);
create index idx_nodes_type      on knowledge_nodes (user_id, node_type);
```

### 3.2 Edges — the connections (this is what makes it a graph)

```sql
create table public.knowledge_edges (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,

  from_node     uuid references public.knowledge_nodes not null,
  to_node       uuid references public.knowledge_nodes not null,

  relation      text not null,           -- see relation vocabulary below
  origin        text not null,           -- 'deterministic' | 'ai' — how it was made
  weight        numeric default 1.0,     -- strength; AI edges carry confidence
  confidence    numeric,                 -- 0-1, only for AI edges

  created_at    timestamptz default now(),

  unique (from_node, to_node, relation)  -- no duplicate edges
);

create index idx_edges_user on knowledge_edges (user_id);
create index idx_edges_from on knowledge_edges (from_node);
create index idx_edges_to   on knowledge_edges (to_node);
```

### 3.3 RLS — per-user full graph isolation

Every user has their own complete graph. A workspace of 5 users = 5 separate graphs, because each person's context differs. Enforced at the database:

```sql
alter table knowledge_nodes enable row level security;
alter table knowledge_edges enable row level security;

create policy "own nodes" on knowledge_nodes
  for all using (auth.uid() = user_id);
create policy "own edges" on knowledge_edges
  for all using (auth.uid() = user_id);
```

User A can never traverse into User B's graph — the isolation is at the engine level, not application logic.

---

## 4. Hybrid edge creation (the key design)

Edges are built two ways. Deterministic edges are free and always correct. AI edges are smart but cost tokens and can err — so they're separated, weighted by confidence, and only used where structure can't capture the relationship.

### 4.1 Deterministic edges (free, exact, built on ingest)

Created by rules the moment a node enters the graph. No AI, no cost, never wrong:

| Relation | Rule |
|---|---|
| `derived_from` | task output node → the file/crawl node it was produced from |
| `part_of` | chunk node → its parent document node |
| `produced_by` | any node → the app_instance/task that created it |
| `sibling_of` | chunks sharing the same parent (sequential context) |
| `uploaded_in` | file chunk → the session/task it arrived in |

These cover all structural relationships — the "plumbing" of the graph. They run in `/link` on ingest, synchronously, at zero token cost.

### 4.2 AI edges (smart, semantic, built async & batched)

Created by a cheap fast model that reads new nodes and proposes semantic links to existing nodes. These capture meaning structure can't:

| Relation | Example |
|---|---|
| `about` | a report chunk → the entity node "Jasper AI" |
| `mentions` | a meeting note → a contact node |
| `contradicts` | two chunks with conflicting claims |
| `supports` | evidence chunk → conclusion chunk |
| `same_topic_as` | two chunks on the same subject from different sources |

**Cost control (critical — this is where naïve graph builds explode):**
- AI edge-building runs **async and batched**, never on the request path — the user's task returns immediately; edges fill in seconds later via the job queue (Inngest).
- Candidate pairs are **pre-filtered by vector similarity first** — only the top-K most-similar existing nodes are shown to the AI, so it never compares a new node against the whole graph. This turns an O(n²) problem into O(n·k).
- The classifier runs on the **cheapest capable model** (Groq/Haiku-class). Extracting 3-5 edges from a node costs a fraction of a cent.
- Every AI edge stores `confidence`; low-confidence edges (<0.6) are dropped, not stored.
- **Every edge-building call is logged to `api_usage_log`** — graph maintenance is a real COGS line, metered like everything else (Master Plan rule).

### 4.3 Entity nodes (what makes connections converge)

When the AI sees "Jasper AI" mentioned across five different chunks, it creates ONE `entity` node for Jasper AI and links all five to it with `about`/`mentions`. Now a query about Jasper pulls all five sources through one hub. This is how the graph gets *sharper over time* — repeated concepts become connection hubs, exactly like Obsidian's most-linked notes.

---

## 5. Grounding query — how the graph feeds the AI (with token control)

When a task needs context, the graph engine's `/query` runs a **two-stage retrieval** and returns a tight, connected context bundle — not a dump.

```
Stage 1 — SEMANTIC ANCHOR (vector)
  embed the user's briefing → find top-K seed nodes by cosine similarity
  (this is plain pgvector — the entry point)

Stage 2 — GRAPH EXPANSION (1-2 hops)
  from each seed node, walk edges to connected nodes
  → pull `about` entity hubs, `derived_from` sources, `supports` evidence
  → stop at 2 hops max (prevents context explosion)
  → rank by (edge weight × node similarity × recency)

RETURN
  a de-duplicated, token-budgeted bundle:
  seed chunks + their highest-value connected chunks
  capped at a hard token ceiling (e.g. 4-8k tokens)
```

**Why this beats flat vector search:** vector alone might return five chunks that all say roughly the same thing. Graph expansion returns the seed chunk PLUS its evidence, its source, and the contradicting note — a *reasoned* context, not a similarity blob. Sharper input → sharper output → less hallucination.

**Token ceiling is non-negotiable.** The `/query` never returns more than its budget. Graph walking is capped at 2 hops and ranked, so cost stays bounded no matter how large the user's graph grows. This is what keeps a rich graph from becoming an expensive one.

---

## 6. Graph view in the UI

The Apps/Data area gets a **Graph tab** — the visible payoff of the whole system, rendered in the all41 design system:

- Nodes as circles (sized by connection count — entity hubs are biggest), colored by `node_type` using the traffic-light-adjacent palette
- Edges as lines (deterministic solid, AI-derived dashed — so the user sees what's structural vs inferred)
- Click a node → see its content + everything connected
- Search → highlights the semantic neighborhood
- This is the "wow" moment: the user *sees* how their competitor data connects to their pricing to their content. It makes the invisible grounding tangible and builds trust that the AI is working from their real, connected world.

Rendering: query `/graph` for the user's nodes+edges (RLS-scoped), render with a force-directed layout. For large graphs, load the neighborhood around a focus node, not the whole thing.

---

## 7. Where this changes the Master Plan

This **replaces** the "start with plain pgvector, add graph later" note in Master Plan §10/§12 — you've decided to build the graph from the start. Adjustments:

- **§13 Data Model:** add `knowledge_nodes` and `knowledge_edges` (above) alongside the existing tables.
- **§12 Stack:** add the Graph Engine as one separate service on the VPS. pgvector still underpins it (Stage 1 retrieval) — the graph is built *on top of* vectors, not instead of them.
- **Roadmap:** the graph engine moves into **Phase 2 (AI Engine)** rather than "later." Build order within Phase 2: (1) nodes + chunked ingest + embeddings, (2) deterministic edges, (3) two-stage grounding query, (4) async AI edges last (they're an enhancement, not a blocker).
- **Financial engine:** AI edge-building and embedding calls are new COGS lines — meter them in `api_usage_log` like every other call. Budget a small per-node ingestion cost into mini-app pricing.
- **Cost guardrail:** because graph maintenance runs async and batched with vector pre-filtering, a token ceiling on queries, and confidence-drop on edges, the graph stays *sharp without becoming expensive* — the whole reason for the hybrid design.

---

## 8. Build order (within Phase 2)

1. **Nodes + chunked ingest** — on file upload / task output, chunk to sections, embed, store as nodes with provenance. (Reuses pgvector you're already adding.)
2. **Deterministic edges** — the free structural plumbing, on ingest. Graph is already useful here.
3. **Two-stage grounding query** — vector anchor + 1-2 hop expansion + token budget. This is what the AI calls for context.
4. **Async AI edges** — the semantic layer, batched via Inngest, vector-pre-filtered, cheap-model, confidence-gated, metered.
5. **Graph view UI** — the visible payoff, last.

Ship steps 1-3 to get sharp grounding fast; steps 4-5 make it sharper and tangible.

---

*The graph engine is the difference between "an AI that answers from your files" and "an AI that understands how your world connects." That's the value. Build it hybrid so it stays sharp without getting expensive, keep it one service so it stays simple, and meter every edge so it stays profitable.*
