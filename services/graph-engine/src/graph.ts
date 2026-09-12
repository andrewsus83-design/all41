/** Read models for the Graph tab: whole-graph (most-connected) or 2-hop neighborhood, plus single node detail. */
import { admin } from './db.js';
import { HttpError } from './errors.js';

const NODE_COLS = 'id,title,node_type,source_type,source_id,created_at';
const EDGE_COLS = 'id,from_node,to_node,relation,origin,weight,confidence';
type EdgeRow = { id: string; from_node: string; to_node: string; relation: string; origin: string; weight: number; confidence: number | null };

const shapeEdge = (e: EdgeRow) => ({ id: e.id, from: e.from_node, to: e.to_node, relation: e.relation, origin: e.origin, weight: Number(e.weight), confidence: e.confidence == null ? null : Number(e.confidence) });

export async function getGraph(user_id: string, focus: string | null, limit: number) {
  let nodeIds: string[];
  let edges: EdgeRow[];
  const degree = new Map<string, number>();
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

  if (focus) {
    const { data: exp, error } = await admin.rpc('graph_expand', { p_user_id: user_id, p_seed_ids: [focus], p_hops: 2, p_limit: limit });
    if (error) throw new HttpError(500, `GRAPH_EXPAND_FAILED: ${error.message}`);
    nodeIds = [focus, ...(exp ?? []).map((e) => e.id)];
    const { data, error: eErr } = await admin.from('knowledge_edges').select(EDGE_COLS).eq('user_id', user_id)
      .or(`from_node.in.(${nodeIds.join(',')}),to_node.in.(${nodeIds.join(',')})`).limit(5000);
    if (eErr) throw new HttpError(500, `EDGES_READ_FAILED: ${eErr.message}`);
    const inSet = new Set(nodeIds);
    edges = (data ?? []).filter((e) => inSet.has(e.from_node) && inSet.has(e.to_node));
    for (const e of edges) { bump(e.from_node); bump(e.to_node); }
  } else {
    const { data, error } = await admin.from('knowledge_edges').select(EDGE_COLS).eq('user_id', user_id).limit(20000);
    if (error) throw new HttpError(500, `EDGES_READ_FAILED: ${error.message}`);
    for (const e of data ?? []) { bump(e.from_node); bump(e.to_node); }
    nodeIds = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
    if (nodeIds.length < limit) { // pad with isolated / newest nodes
      const { data: extra } = await admin.from('knowledge_nodes').select('id').eq('user_id', user_id)
        .order('created_at', { ascending: false }).limit(limit);
      for (const n of extra ?? []) if (nodeIds.length < limit && !degree.has(n.id)) nodeIds.push(n.id);
    }
    const inSet = new Set(nodeIds);
    edges = (data ?? []).filter((e) => inSet.has(e.from_node) && inSet.has(e.to_node));
  }

  if (nodeIds.length === 0) return { nodes: [], edges: [] };
  const { data: nodes, error: nErr } = await admin.from('knowledge_nodes').select(NODE_COLS).eq('user_id', user_id).in('id', nodeIds);
  if (nErr) throw new HttpError(500, `NODES_READ_FAILED: ${nErr.message}`);
  return {
    nodes: (nodes ?? []).map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 })),
    edges: edges.map(shapeEdge),
  };
}

export async function getNode(user_id: string, id: string) {
  const { data: node, error } = await admin.from('knowledge_nodes')
    .select('id,title,content,node_type,source_type,source_id,parent_node,chunk_index,token_count,tags,entities,created_at,updated_at')
    .eq('user_id', user_id).eq('id', id).maybeSingle();
  if (error) throw new HttpError(500, `NODE_READ_FAILED: ${error.message}`);
  if (!node) throw new HttpError(404, 'NODE_NOT_FOUND');
  const { data: edges, error: eErr } = await admin.from('knowledge_edges').select(EDGE_COLS).eq('user_id', user_id).or(`from_node.eq.${id},to_node.eq.${id}`);
  if (eErr) throw new HttpError(500, `EDGES_READ_FAILED: ${eErr.message}`);
  const neighborIds = [...new Set((edges ?? []).map((e) => (e.from_node === id ? e.to_node : e.from_node)))];
  const titles = new Map<string, { title: string | null; node_type: string }>();
  if (neighborIds.length) {
    const { data: nb } = await admin.from('knowledge_nodes').select('id,title,node_type').eq('user_id', user_id).in('id', neighborIds);
    for (const n of nb ?? []) titles.set(n.id, { title: n.title, node_type: n.node_type });
  }
  return {
    node,
    edges: (edges ?? []).map((e) => {
      const nid = e.from_node === id ? e.to_node : e.from_node;
      return { ...shapeEdge(e), direction: e.from_node === id ? 'out' : 'in', neighbor: { id: nid, ...(titles.get(nid) ?? { title: null, node_type: 'unknown' }) } };
    }),
  };
}
