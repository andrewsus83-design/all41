import type { ReactNode } from "react";

/** Tiny markdown → React: headings, paragraphs, bold/italic/code, lists, links. No HTML passthrough. */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="num text-[0.9em] px-1 rounded bg-bg-elev-2">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("*")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else if (tok.startsWith("[")) {
      const label = tok.slice(1, tok.indexOf("]("));
      out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer" className="text-green underline">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let n = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={n++} className="leading-relaxed">{inline(para.join(" "), `p${n}`)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((t, i) => <li key={i}>{inline(t, `l${n}-${i}`)}</li>);
      blocks.push(list.ordered ? <ol key={n++} className="list-decimal pl-6 space-y-1">{items}</ol> : <ul key={n++} className="list-disc pl-6 space-y-1">{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (h) {
      flushPara(); flushList();
      const lvl = h[1].length;
      const cls = lvl === 1 ? "text-3xl font-semibold mt-6" : lvl === 2 ? "text-2xl font-medium mt-5" : "text-xl font-medium mt-4";
      blocks.push(lvl === 1 ? <h1 key={n++} className={cls}>{inline(h[2], `h${n}`)}</h1> : lvl === 2 ? <h2 key={n++} className={cls}>{inline(h[2], `h${n}`)}</h2> : <h3 key={n++} className={cls}>{inline(h[2], `h${n}`)}</h3>);
      continue;
    }
    if (li || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((li ?? ol)![1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  if (!blocks.length) return <p className="text-fg-faint">Nothing written yet.</p>;
  return <div className="space-y-3">{blocks}</div>;
}
