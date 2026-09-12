/** Inline SVG — nodes are your files/outputs/notes; solid edges are explicit links, dashed edges were inferred by the graph engine. */
export function GraphIllustration({ className }: { className?: string }) {
  const nodes = [
    { id: "a", x: 60, y: 110, r: 14, label: "pricing.pdf", tone: "amber" },
    { id: "b", x: 200, y: 50, r: 18, label: "Jasper report", tone: "green" },
    { id: "c", x: 330, y: 130, r: 12, label: "note · Q4 plan", tone: "amber" },
    { id: "d", x: 210, y: 190, r: 12, label: "briefing 09-12", tone: "green" },
    { id: "e", x: 420, y: 60, r: 10, label: "competitors.csv", tone: "amber" },
  ];
  const edges: Array<[string, string, boolean]> = [
    ["a", "b", false],
    ["b", "c", true],
    ["b", "d", false],
    ["c", "e", true],
    ["a", "d", true],
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 480 240" className={className} role="img" aria-label="A small knowledge graph: five connected nodes, two edges inferred by AI shown dashed">
      {edges.map(([f, t, dashed], i) => (
        <line
          key={i}
          x1={byId[f].x}
          y1={byId[f].y}
          x2={byId[t].x}
          y2={byId[t].y}
          stroke={dashed ? "var(--green)" : "var(--amber)"}
          strokeOpacity={dashed ? 0.7 : 0.5}
          strokeWidth={1.5}
          strokeDasharray={dashed ? "5 5" : undefined}
        />
      ))}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r + 8} fill={n.tone === "amber" ? "var(--amber-soft)" : "var(--green-soft)"} />
          <circle cx={n.x} cy={n.y} r={n.r} fill="var(--bg-elev-2)" stroke={n.tone === "amber" ? "var(--amber)" : "var(--green)"} strokeWidth={1.5} />
          <text x={n.x} y={n.y + n.r + 22} textAnchor="middle" fill="var(--fg-muted)" fontSize="11" fontFamily="var(--font-mono)">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
