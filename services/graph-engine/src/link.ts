/**
 * Deterministic edges — free, exact, rebuilt on every /ingest and /link.
 *
 *   part_of      chunk → document                         w 1.0
 *   sibling_of   chunk[i] → chunk[i+1]                    w 0.6
 *   derived_from document → document of each derived_from_source_ids  w 1.0
 *   uploaded_in  (source_type='file' + task_id) chunk & document → TASK HUB   w 1.0
 *   produced_by  (other source_type + task_id) document → TASK HUB           w 1.0
 *
 * TASK HUB: one node per (user, task) — node_type 'task', source_type 'task', source_id = task_id,
 * no embedding (never a seed, only reachable by expansion). It is find-or-created here and
 * survives re-ingest (ingest deletes a source's nodes EXCEPT node_type 'task'). For source_type='task'
 * the ingested output document links produced_by → the hub, so files uploaded in a task and the
 * task's output meet at the hub within 2 hops.
 */
import { admin } from './db.js';
import { HttpError } from './errors.js';

export type LinkInput = {
  user_id: string;
  source_type: string;
  source_id: string;
  task_id?: string | null;
  derived_from_source_ids?: string[];
};
type EdgeRow = { user_id: string; from_node: string; to_node: string; relation: string; origin: 'deterministic' | 'ai'; weight: number; confidence?: number | null };

export async function insertEdges(rows: EdgeRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await admin
    .from('knowledge_edges')
    .upsert(rows, { onConflict: 'from_node,to_node,relation', ignoreDuplicates: true })
    .select('id');
  if (error) throw new HttpError(500, `EDGE_INSERT_FAILED: ${error.message}`);
  return data?.length ?? 0;
}

export async function findOrCreateTaskHub(user_id: string, task_id: string): Promise<string> {
  const q = () => admin.from('knowledge_nodes').select('id')
    .eq('user_id', user_id).eq('node_type', 'task').eq('source_type', 'task').eq('source_id', task_id).maybeSingle();
  const { data, error } = await q();
  if (error) throw new HttpError(500, `HUB_READ_FAILED: ${error.message}`);
  if (data) return data.id;
  const { data: ins, error: iErr } = await admin.from('knowledge_nodes')
    .insert({ user_id, node_type: 'task', source_type: 'task', source_id: task_id, title: `Task ${task_id.slice(0, 8)}`, content: `Task ${task_id}`, token_count: 0 })
    .select('id').single();
  if (iErr || !ins) {
    const again = await q(); // lost a race → read the winner
    if (again.data) return again.data.id;
    throw new HttpError(500, `HUB_CREATE_FAILED: ${iErr?.message}`);
  }
  return ins.id;
}

export async function linkSource(input: LinkInput): Promise<{ edges_created: number; document_id: string | null }> {
  const { user_id, source_type, source_id } = input;
  const { data: nodes, error } = await admin.from('knowledge_nodes')
    .select('id,node_type,chunk_index,parent_node')
    .eq('user_id', user_id).eq('source_type', source_type).eq('source_id', source_id)
    .neq('node_type', 'task')
    .order('chunk_index', { ascending: true, nullsFirst: true });
  if (error) throw new HttpError(500, `NODES_READ_FAILED: ${error.message}`);
  const doc = nodes?.find((n) => n.node_type === 'document');
  if (!doc) return { edges_created: 0, document_id: null };
  const chunks = (nodes ?? []).filter((n) => n.parent_node === doc.id).sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
  const ids = [doc.id, ...chunks.map((c) => c.id)];

  // rebuild: drop this source's deterministic edges, then insert fresh
  const { error: dErr } = await admin.from('knowledge_edges').delete().eq('user_id', user_id).eq('origin', 'deterministic').in('from_node', ids);
  if (dErr) throw new HttpError(500, `EDGE_DELETE_FAILED: ${dErr.message}`);

  const rows: EdgeRow[] = [];
  const det = (from: string, to: string, relation: string, weight = 1.0) => rows.push({ user_id, from_node: from, to_node: to, relation, origin: 'deterministic', weight });
  for (const c of chunks) det(c.id, doc.id, 'part_of');
  for (let i = 0; i + 1 < chunks.length; i++) det(chunks[i].id, chunks[i + 1].id, 'sibling_of', 0.6);

  const derived = (input.derived_from_source_ids ?? []).filter((s) => s !== source_id);
  if (derived.length) {
    const { data: parents, error: pErr } = await admin.from('knowledge_nodes').select('id')
      .eq('user_id', user_id).eq('node_type', 'document').in('source_id', derived);
    if (pErr) throw new HttpError(500, `DERIVED_READ_FAILED: ${pErr.message}`);
    for (const p of parents ?? []) det(doc.id, p.id, 'derived_from');
  }

  if (input.task_id) {
    const hub = await findOrCreateTaskHub(user_id, input.task_id);
    if (source_type === 'file') for (const id of ids) det(id, hub, 'uploaded_in');
    else det(doc.id, hub, 'produced_by');
  }

  const edges_created = await insertEdges(rows);
  return { edges_created, document_id: doc.id };
}
