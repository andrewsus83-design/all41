import { describe, expect, it } from 'vitest';
import { chunkText, estimateTokens } from './chunk.js';

const para = (seed: number, words = 60) => Array.from({ length: words }, (_, i) => `word${(seed * 31 + i) % 97}`).join(' ') + '.';
const longDoc = Array.from({ length: 40 }, (_, i) => para(i)).join('\n\n');
const mdDoc = `# Intro\n\n${para(1)}\n\n${para(2)}\n\n## Pricing\n\n${para(3)}\n\n${para(4)}\n\n${para(5)}\n\n# Summary\n\n${para(6)}`;

describe('chunkText', () => {
  it('never exceeds maxTokens and keeps chunks reasonably full', () => {
    const chunks = chunkText(longDoc, { minTokens: 200, maxTokens: 500 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.token_count).toBeLessThanOrEqual(500);
    for (const c of chunks.slice(0, -1)) expect(c.token_count).toBeGreaterThanOrEqual(200);
    chunks.forEach((c, i) => expect(c.chunk_index).toBe(i));
  });

  it('hard-splits a single giant paragraph', () => {
    const giant = para(9, 3000);
    const chunks = chunkText(giant, { maxTokens: 500 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.token_count).toBeLessThanOrEqual(500);
    expect(chunks.map((c) => c.content).join(' ').replace(/\s+/g, ' ')).toBe(giant.replace(/\s+/g, ' '));
  });

  it('preserves markdown headings as titles and does not cross sections', () => {
    const chunks = chunkText(mdDoc, { title: 'Doc' });
    const titles = [...new Set(chunks.map((c) => c.title))];
    expect(titles).toEqual(['Intro', 'Pricing', 'Summary']);
    for (const c of chunks) expect(c.content).not.toMatch(/^#/m);
  });

  it('uses the document title for untitled leading text', () => {
    const chunks = chunkText(`${para(1)}\n\n# Later\n\n${para(2)}`, { title: 'My File' });
    expect(chunks[0].title).toBe('My File');
    expect(chunks[1].title).toBe('Later');
  });

  it('counts tokens as ceil(chars/4)', () => {
    for (const c of chunkText(longDoc)) expect(c.token_count).toBe(estimateTokens(c.content));
  });

  it('is deterministic', () => {
    expect(chunkText(mdDoc)).toEqual(chunkText(mdDoc));
    expect(chunkText(longDoc)).toEqual(chunkText(longDoc));
  });

  it('returns [] for empty input', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });
});
