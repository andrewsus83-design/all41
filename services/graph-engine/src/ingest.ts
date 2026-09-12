import { chunkText, summarize } from './chunk.js';
import { admin } from './db.js';
import { embedMetered, embeddingsMode, toVectorLiteral } from './embed.js';
import { HttpError } from './errors.js';
import { linkSource } from './link.js';

export type SourceType = 'file' | 'task' | 'app_instance' | 'manual';
export type IngestInput = {
  user_id: string;
  source_type: SourceType;
  source_id: string;
  title: string;
  content: string;
  node_type?: string;
  task_id?: string | null;
  derived_from_source_ids?: string[];
  mime?: string;
};

const DEFAULT_NODE_TYPE: Record<SourceType, string> = { file: 'file_chunk', task: 'task_output', app_instance: 'app_result', manual: 'note' };

/** Replace-on-reingest: chunk → embed (metered, may 402) → delete old nodes → insert → deterministic link. */
export async function ingest(input: IngestInput) {
  const { user_id, source_type, source_id, title } = input;
  const node_type = input.node_type ?? DEFAULT_NODE_TYPE[source_type];
  // a task's own output is produced by that task unless told otherwise
  const task_id = input.task_id ?? (source_type === 'task' ? source_id : null);

  const chunks = chunkText(input.content, { title });
  if (chunks.length === 0) throw new HttpError(400, 'EMPTY_CONTENT');
  const docContent = summarize(input.content);

  // embed BEFORE touching existing nodes so a 402 leaves the old graph intact
  const { vectors, metered } = await embedMetered(user_id, [docContent, ...chunks.map((c) => c.content)], task_id);

  const { error: delErr } = await admin.from('knowledge_nodes').delete()
    .eq('user_id', user_id).eq('source_type', source_type).eq('source_id', source_id).neq('node_type', 'task');
  if (delErr) throw new HttpError(500, `NODE_DELETE_FAILED: ${delErr.message}`);

  const tags = input.mime ? [input.mime] : [];
  const { data: doc, error: docErr } = await admin.from('knowledge_nodes').insert({
    user_id, node_type: 'document', source_type, source_id, title, content: docContent,
    token_count: Math.ceil(docContent.length / 4), embedding: toVectorLiteral(vectors[0]), tags,
  }).select('id').single();
  if (docErr || !doc) throw new HttpError(500, `DOC_INSERT_FAILED: ${docErr?.message}`);

  const { data: inserted, error: chErr } = await admin.from('knowledge_nodes').insert(
    chunks.map((c, i) => ({
      user_id, node_type, source_type, source_id, parent_node: doc.id, title: c.title ?? title,
      content: c.content, chunk_index: c.chunk_index, token_count: c.token_count, embedding: toVectorLiteral(vectors[i + 1]), tags,
    })),
  ).select('id,chunk_index').order('chunk_index');
  if (chErr) throw new HttpError(500, `CHUNK_INSERT_FAILED: ${chErr.message}`);

  const { edges_created } = await linkSource({ user_id, source_type, source_id, task_id, derived_from_source_ids: input.derived_from_source_ids });
  return {
    document_id: doc.id,
    node_ids: (inserted ?? []).map((n) => n.id),
    chunks: chunks.length,
    edges_created,
    cost_usd: metered.cost_usd,
    billed_usd: metered.billed_usd,
    embeddings: embeddingsMode(),
  };
}
