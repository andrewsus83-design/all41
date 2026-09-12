"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type GNode = { id: string; title: string; node_type: string; degree: number; content?: string };
type GEdge = { from: string; to: string; relation: string; origin: string; weight: number };
type SimNode = SimulationNodeDatum & GNode;
type SimLink = SimulationLinkDatum<SimNode> & GEdge;

const COLORS: Record<string, string> = {
  entity: "#ffb020",
  file_chunk: "#2fd27d",
  task_output: "#ff6b6d",
  document: "#a1a1aa",
  note: "#f4f4f5",
};
const LABELS: Record<string, string> = { entity: "idea", file_chunk: "file", task_output: "result", document: "doc", note: "note" };
const labelFor = (t: string) => LABELS[t] ?? t.replace(/_/g, " ");
const colorFor = (t: string) => COLORS[t] ?? "#63636b";

export function ConnectionsTab({ engineConfigured }: { engineConfigured: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{ nodes: GNode[]; edges: GEdge[]; engine: string } | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GNode | null>(null);
  const [detail, setDetail] = useState<{ node?: GNode & { content?: string }; connections?: Array<{ id: string; title: string; relation: string; origin: string }>; error?: string } | null>(null);
  const simRef = useRef<{ nodes: SimNode[]; links: SimLink[] } | null>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);
  const selectNode = (n: GNode | null) => { setSelected(n); setDetail(null); };

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then(setData).catch(() => setData({ nodes: [], edges: [], engine: "unreachable" }));
  }, []);

  const highlighted = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return new Set<string>();
    return new Set(data.nodes.filter((n) => (n.title ?? "").toLowerCase().includes(q) || (n.content ?? "").toLowerCase().includes(q)).map((n) => n.id));
  }, [search, data]);
  const highlightedRef = useRef(highlighted);
  useEffect(() => { highlightedRef.current = highlighted; }, [highlighted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.edges.filter((e) => byId.has(e.from) && byId.has(e.to)).map((e) => ({ ...e, source: e.from, target: e.to }));
    simRef.current = { nodes, links };
    view.current = { x: W / 2, y: H / 2, k: 1 };

    const r = (n: SimNode) => 4 + Math.min(14, Math.sqrt(n.degree ?? 0) * 3);
    const sim = forceSimulation(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(60).strength(0.4))
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide<SimNode>((d) => r(d) + 2));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const { x, y, k } = view.current;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      for (const l of links) {
        const s = l.source as SimNode, t = l.target as SimNode;
        if (s.x === undefined || t.x === undefined) continue;
        ctx.beginPath();
        ctx.setLineDash(l.origin === "ai" ? [4, 4] : []);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = Math.max(0.5, Math.min(2, l.weight ?? 1));
        ctx.moveTo(s.x, s.y!); ctx.lineTo(t.x, t.y!); ctx.stroke();
      }
      ctx.setLineDash([]);
      const hl = highlightedRef.current;
      const hasSearch = hl.size > 0 || searchRef.current.trim().length > 0;
      for (const n of nodes) {
        if (n.x === undefined) continue;
        const dim = hasSearch && !hl.has(n.id);
        ctx.beginPath();
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fillStyle = colorFor(n.node_type);
        ctx.arc(n.x, n.y!, r(n), 0, Math.PI * 2);
        ctx.fill();
        if (hl.has(n.id) || selected?.id === n.id) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.globalAlpha = 1;
        if (k > 0.8 && (n.degree ?? 0) > 1 || hl.has(n.id)) {
          ctx.fillStyle = "rgba(244,244,245,0.8)";
          ctx.font = `${11 / k}px ui-sans-serif, system-ui`;
          ctx.fillText((n.title ?? "").slice(0, 28), n.x + r(n) + 3, n.y! + 4);
        }
      }
      ctx.restore();
    };
    sim.on("tick", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    const interval = setInterval(() => { raf = requestAnimationFrame(draw); }, 250);

    const toWorld = (px: number, py: number) => ({ x: (px - view.current.x) / view.current.k, y: (py - view.current.y) / view.current.k });
    const onDown = (e: MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.current.x, vy: view.current.y }; };
    const onMove = (e: MouseEvent) => { if (!drag.current) return; view.current.x = drag.current.vx + (e.clientX - drag.current.x); view.current.y = drag.current.vy + (e.clientY - drag.current.y); draw(); };
    const onUp = (e: MouseEvent) => {
      const d = drag.current; drag.current = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
      const rect = canvas.getBoundingClientRect();
      const w = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      let hit: SimNode | null = null;
      for (const n of nodes) if (n.x !== undefined && Math.hypot(n.x - w.x, n.y! - w.y) <= r(n) + 3) { hit = n; break; }
      selectNode(hit);
      draw();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const k0 = view.current.k;
      const k1 = Math.max(0.2, Math.min(5, k0 * (e.deltaY < 0 ? 1.1 : 0.9)));
      view.current.x = px - ((px - view.current.x) * k1) / k0;
      view.current.y = py - ((py - view.current.y) * k1) / k0;
      view.current.k = k1;
      draw();
    };
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      sim.stop(); clearInterval(interval); cancelAnimationFrame(raf);
      canvas.removeEventListener("mousedown", onDown); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); canvas.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    fetch(`/api/graph/node/${encodeURIComponent(selected.id)}`).then(async (r) => (r.ok ? r.json() : { error: (await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}` })).then((j) => alive && setDetail(j)).catch((e) => alive && setDetail({ error: String(e) }));
    return () => { alive = false; };
  }, [selected]);

  const offline = !engineConfigured || (data && data.engine !== "graph");

  return (
    <div className="space-y-4">
      <p className="text-fg-muted">How your files, notes and results connect. Upload a file or connect a doc and it shows up here.</p>
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <Card className="p-0 overflow-hidden relative min-h-[560px]">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-10 bg-bg/80 backdrop-blur" />
          <div className="ml-auto flex gap-2 flex-wrap text-xs text-fg-faint">
            {Object.entries(COLORS).map(([k, c]) => (<span key={k} className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: c }} />{labelFor(k)}</span>))}
            <span>· dashed = suggested by AI</span>
          </div>
        </div>
        {!data && <p className="absolute inset-0 grid place-items-center text-fg-faint pulse-soft">Loading…</p>}
        {data && data.nodes.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-center px-8">
            <div className="space-y-2">
              <p className="text-2xl font-title">{offline ? "Connections are being prepared" : "Nothing connected yet"}</p>
              <CardHint>{offline ? "Everything you add is kept safely and will be connected shortly." : "Upload a file or connect a doc, and it will appear here."}</CardHint>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-[560px] cursor-grab active:cursor-grabbing" />
      </Card>
      <Card className="space-y-4 min-h-[200px]">
        {!selected ? (
          <>
            <CardTitle>Details</CardTitle>
            <CardHint>Click a dot to see what it says and what it links to. Drag to move around, scroll to zoom.</CardHint>
            {data && <p className="text-xs text-fg-faint"><span className="num">{data.nodes.length}</span> pieces · <span className="num">{data.edges.length}</span> links</p>}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="leading-tight">{selected.title}</CardTitle>
              <button type="button" className="text-xs text-fg-faint hover:text-fg" onClick={() => selectNode(null)}>close</button>
            </div>
            <div className="flex gap-2"><Badge>{labelFor(selected.node_type)}</Badge><Badge><span className="num">{selected.degree}</span> links</Badge></div>
            {!detail && <p className="text-fg-faint text-sm pulse-soft">Loading…</p>}
            {detail?.error && <p className="text-red text-sm">Could not load this right now.</p>}
            {detail?.node?.content && <p className="text-sm text-fg-muted whitespace-pre-wrap max-h-64 overflow-y-auto">{detail.node.content}</p>}
            {detail?.connections && detail.connections.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-fg-faint">Linked to</p>
                <ul className="text-sm space-y-1">
                  {detail.connections.map((c) => (
                    <li key={c.id} className="flex gap-2"><span className="text-fg-faint text-xs">{c.relation.replace(/_/g, " ")}{c.origin === "ai" ? " · ai" : ""}</span><span className="truncate">{c.title}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
    </div>
  );
}
