/**
 * Section-level chunking. Pure + deterministic.
 * - split on markdown headings → sections (heading kept as chunk title)
 * - paragraphs (blank-line separated) are merged greedily up to maxTokens
 * - a single paragraph over maxTokens is hard-split at sentence, then whitespace, boundaries
 * - a trailing small chunk is folded into its predecessor when the pair still fits
 * Tokens are estimated as ceil(chars / 4).
 */
export type Chunk = { title: string | null; content: string; token_count: number; chunk_index: number };
export type ChunkOptions = { minTokens?: number; maxTokens?: number; title?: string | null };

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

type Section = { title: string | null; paragraphs: string[] };

function toSections(content: string, docTitle: string | null): Section[] {
  const sections: Section[] = [];
  let cur: Section = { title: docTitle, paragraphs: [] };
  let buf: string[] = [];
  const flushPara = () => {
    const p = buf.join('\n').trim();
    if (p) cur.paragraphs.push(p);
    buf = [];
  };
  for (const raw of content.replace(/\r\n?/g, '\n').split('\n')) {
    const h = raw.match(HEADING);
    if (h) {
      flushPara();
      if (cur.paragraphs.length) sections.push(cur);
      cur = { title: h[1].trim(), paragraphs: [] };
    } else if (raw.trim() === '') flushPara();
    else buf.push(raw);
  }
  flushPara();
  if (cur.paragraphs.length) sections.push(cur);
  return sections;
}

/** Split one over-long paragraph into pieces ≤ maxChars, preferring sentence then whitespace boundaries. */
function hardSplit(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '), window.lastIndexOf('\n'));
    if (cut < maxChars * 0.5) cut = window.lastIndexOf(' ');
    if (cut < maxChars * 0.5) cut = maxChars;
    else cut += 1;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function chunkText(content: string, opts: ChunkOptions = {}): Chunk[] {
  const minTokens = opts.minTokens ?? 200;
  const maxTokens = opts.maxTokens ?? 500;
  const maxChars = maxTokens * 4;
  const chunks: Chunk[] = [];

  for (const section of toSections(content, opts.title ?? null)) {
    const pieces = section.paragraphs.flatMap((p) => (estimateTokens(p) > maxTokens ? hardSplit(p, maxChars) : [p]));
    const sectionChunks: string[] = [];
    let acc = '';
    for (const piece of pieces) {
      const joined = acc ? `${acc}\n\n${piece}` : piece;
      if (acc && estimateTokens(joined) > maxTokens) { sectionChunks.push(acc); acc = piece; }
      else acc = joined;
    }
    if (acc) sectionChunks.push(acc);
    // fold a small trailing chunk into its predecessor when the pair still fits
    if (sectionChunks.length > 1) {
      const last = sectionChunks[sectionChunks.length - 1];
      const prev = sectionChunks[sectionChunks.length - 2];
      const merged = `${prev}\n\n${last}`;
      if (estimateTokens(last) < minTokens && estimateTokens(merged) <= maxTokens) sectionChunks.splice(-2, 2, merged);
    }
    for (const c of sectionChunks) chunks.push({ title: section.title, content: c, token_count: estimateTokens(c), chunk_index: chunks.length });
  }
  return chunks;
}

/** Short, human-readable document summary for the parent node. */
export function summarize(content: string, maxChars = 300): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 1).trimEnd()}…`;
}
