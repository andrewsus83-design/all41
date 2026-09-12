/** Pure pricing: cost = tokens × rate; billed = cost × markup × (1 + platform_fee). Unit-tested; db.ts uses it. */
export type Rate = { input_rate: number; output_rate: number; unit: string };
export type Settings = { markup: number; platform_fee: number };
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function priceCall(rate: Rate, inputTokens: number, outputTokens: number, s: Settings) {
  const cost = rate.unit === 'per_1m_tokens'
    ? (inputTokens * rate.input_rate + outputTokens * rate.output_rate) / 1_000_000
    : rate.input_rate; // per_call / per_page: one unit per call
  const cost_usd = round6(cost);
  const billed_usd = round6(cost_usd * s.markup * (1 + s.platform_fee));
  return { cost_usd, billed_usd };
}
