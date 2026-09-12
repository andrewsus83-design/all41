import { describe, expect, it } from 'vitest';
import { priceCall } from './pricing.js';

const s = { markup: 3.2, platform_fee: 0.06 };
describe('priceCall', () => {
  it('prices text-embedding-3-small at $0.02 per 1M input tokens with markup and fee', () => {
    const r = priceCall({ input_rate: 0.02, output_rate: 0, unit: 'per_1m_tokens' }, 1_000_000, 0, s);
    expect(r.cost_usd).toBe(0.02);
    expect(r.billed_usd).toBeCloseTo(0.02 * 3.2 * 1.06, 6);
  });
  it('prices llama-3.3-70b input + output', () => {
    const r = priceCall({ input_rate: 0.13, output_rate: 0.4, unit: 'per_1m_tokens' }, 2000, 500, s);
    expect(r.cost_usd).toBeCloseTo((2000 * 0.13 + 500 * 0.4) / 1e6, 6);
  });
  it('mock rate bills zero', () => {
    expect(priceCall({ input_rate: 0, output_rate: 0, unit: 'per_1m_tokens' }, 5000, 0, s)).toEqual({ cost_usd: 0, billed_usd: 0 });
  });
});
