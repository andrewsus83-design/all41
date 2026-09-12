import './env.js';
import { timingSafeEqual } from 'node:crypto';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { HttpError } from './errors.js';
import { embeddingsMode } from './embed.js';
import { ingest } from './ingest.js';
import { linkSource } from './link.js';
import { queryGraph } from './query.js';
import { getGraph, getNode } from './graph.js';
import { aiLink } from './aiEdges.js';
import { startSecretsRefresh } from './secrets.js';
startSecretsRefresh();

const SECRET = process.env.GRAPH_ENGINE_SECRET;
if (!SECRET) throw new Error('GRAPH_ENGINE_SECRET is required');
const PORT = Number(process.env.PORT ?? 3401);

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'graph-engine', embeddings: embeddingsMode() }));

app.use('*', async (c, next) => {
  const token = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(token), b = Buffer.from(SECRET);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return c.json({ error: 'UNAUTHORIZED' }, 401);
  await next();
});

// --- schemas -------------------------------------------------------------------
const uuid = z.guid(); // any 8-4-4-4-12 hex (Postgres uuid), not RFC-variant strict
const SourceType = z.enum(['file', 'task', 'app_instance', 'manual']);
const IngestBody = z.object({
  user_id: uuid, source_type: SourceType, source_id: uuid, title: z.string().min(1).max(500), content: z.string().min(1),
  node_type: z.string().min(1).max(40).optional(), task_id: uuid.nullish(), derived_from_source_ids: z.array(uuid).max(50).optional(), mime: z.string().max(120).optional(),
});
const LinkBody = z.object({ user_id: uuid, source_type: SourceType, source_id: uuid, task_id: uuid.nullish(), derived_from_source_ids: z.array(uuid).max(50).optional() });
const QueryBody = z.object({
  user_id: uuid, query: z.string().min(1).max(8000), k: z.number().int().min(1).max(50).default(8), hops: z.number().int().min(0).max(2).default(2),
  token_budget: z.number().int().min(0).max(32000).default(6000), types: z.array(z.string()).max(20).nullish(),
});
const AiLinkBody = z.object({ user_id: uuid, source_type: SourceType, source_id: uuid, k: z.number().int().min(1).max(20).default(6) });
const GraphQuery = z.object({ user_id: uuid, focus: uuid.optional(), limit: z.coerce.number().int().min(1).max(1000).default(300) });
const NodeQuery = z.object({ user_id: uuid });

async function body<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try { raw = await c.req.json(); } catch { throw new HttpError(400, 'INVALID_JSON'); }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, z.prettifyError(r.error));
  return r.data;
}
function query<T extends z.ZodTypeAny>(c: Context, schema: T): z.infer<T> {
  const r = schema.safeParse(c.req.query());
  if (!r.success) throw new HttpError(400, z.prettifyError(r.error));
  return r.data;
}

// --- routes --------------------------------------------------------------------
app.post('/ingest', async (c) => c.json(await ingest(await body(c, IngestBody))));
app.post('/link', async (c) => c.json(await linkSource(await body(c, LinkBody))));
app.post('/link/ai', async (c) => c.json(await aiLink(await body(c, AiLinkBody))));
app.post('/query', async (c) => c.json(await queryGraph(await body(c, QueryBody))));
app.get('/graph', async (c) => { const q = query(c, GraphQuery); return c.json(await getGraph(q.user_id, q.focus ?? null, q.limit)); });
app.get('/node/:id', async (c) => {
  const id = uuid.safeParse(c.req.param('id'));
  if (!id.success) throw new HttpError(400, 'INVALID_NODE_ID');
  return c.json(await getNode(query(c, NodeQuery).user_id, id.data));
});

app.notFound((c) => c.json({ error: 'NOT_FOUND' }, 404));
app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, ...(err.detail !== undefined ? { detail: err.detail } : {}) }, err.status as 400);
  console.error(err);
  return c.json({ error: 'INTERNAL_ERROR' }, 500);
});

serve({ fetch: app.fetch, port: PORT }, () => console.log(`graph-engine listening on :${PORT} (embeddings=${embeddingsMode()})`));
