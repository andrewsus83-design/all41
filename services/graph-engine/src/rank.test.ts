import { describe, expect, it } from 'vitest';
import { fillBudget, rank, recencyFactor, type Candidate } from './rank.js';

const mk = (id: string, token_count: number, similarity = 0.5, extra: Partial<Candidate> = {}): Candidate => ({
  id, title: id, content: 'x'.repeat(token_count * 4), node_type: 'file_chunk', similarity, hop: 0, via: null,
  path_weight: 1, token_count, created_at: new Date().toISOString(), ...extra,
});

describe('fillBudget', () => {
  it('never exceeds the budget (randomized)', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let trial = 0; trial < 200; trial++) {
      const budget = Math.floor(rnd() * 8000);
      const cands = Array.from({ length: Math.floor(rnd() * 50) }, (_, i) => mk(`n${i}`, Math.floor(rnd() * 900)));
      const { picked, tokens } = fillBudget(cands, budget);
      expect(tokens).toBeLessThanOrEqual(budget);
      expect(picked.reduce((s, c) => s + c.token_count, 0)).toBe(tokens);
    }
  });

  it('keeps rank order and skips oversized items', () => {
    const { picked, tokens } = fillBudget([mk('a', 300), mk('b', 5000), mk('c', 200)], 600);
    expect(picked.map((c) => c.id)).toEqual(['a', 'c']);
    expect(tokens).toBe(500);
  });

  it('returns nothing for a zero budget', () => {
    expect(fillBudget([mk('a', 1)], 0)).toEqual({ picked: [], tokens: 0 });
  });
});

describe('rank', () => {
  it('sorts by path_weight × similarity × recency and de-duplicates', () => {
    const old = new Date(Date.now() - 200 * 86_400_000).toISOString();
    const r = rank([
      mk('seed', 100, 0.8),
      mk('exp', 100, 0.9, { hop: 1, path_weight: 0.6 }),
      mk('stale', 100, 0.9, { created_at: old }),
      mk('seed', 100, 0.2),
      mk('zero', 100, 0),
    ]);
    expect(r.map((c) => c.id)).toEqual(['seed', 'stale', 'exp']);
    expect(r[0].score).toBeCloseTo(0.8);
    expect(r[1].score).toBeCloseTo(0.54);
    expect(r[2].score).toBeCloseTo(0.54);
  });
});

describe('recencyFactor', () => {
  it('decays from 1.0 (<7d) to 0.6 (≥90d)', () => {
    const now = Date.now();
    const at = (d: number) => new Date(now - d * 86_400_000).toISOString();
    expect(recencyFactor(at(1), now)).toBe(1);
    expect(recencyFactor(at(7), now)).toBe(1);
    expect(recencyFactor(at(48.5), now)).toBeCloseTo(0.8, 5);
    expect(recencyFactor(at(90), now)).toBe(0.6);
    expect(recencyFactor(at(400), now)).toBe(0.6);
  });
});
