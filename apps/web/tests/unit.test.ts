import { describe, it, expect } from "vitest";
import { costFromRate, billedFromCost } from "@/lib/finance/cost";
import { heuristicIntent } from "@/lib/ai/classify";
import { safeJson } from "@/lib/ai/callModel";
import { BriefingSchema, briefingIsVague } from "@/lib/engine/briefing";
import { pseudoEmbed } from "@/lib/ai/embed";

describe("cost math", () => {
  it("per_1m_tokens", () => {
    const c = costFromRate({ api_provider: "x", api_model: "y", input_rate: 0.2, output_rate: 1.2, unit: "per_1m_tokens" }, { inputTokens: 10_000, outputTokens: 1_000 });
    expect(c).toBeCloseTo(0.002 + 0.0012, 8);
  });
  it("per_page", () => {
    expect(costFromRate({ api_provider: "f", api_model: "s", input_rate: 0.001, output_rate: 0, unit: "per_page" }, { apiCredits: 5 })).toBeCloseTo(0.005, 8);
  });
  it("billed = cogs × markup × (1+fee)", () => {
    expect(billedFromCost(0.01, { markup: 3.2, platformFee: 0.06, freeTierMaxCostUsd: 0.02, fixedCostsDailyUsd: 2 })).toBeCloseTo(0.03392, 6);
  });
});

describe("intent heuristic", () => {
  it("routes obvious cases", () => {
    expect(heuristicIntent("write a linkedin post about pricing")).toBe("content");
    expect(heuristicIntent("fix this sql query")).toBe("code");
    expect(heuristicIntent("what's the latest news on Jasper AI pricing")).toBe("research");
    expect(heuristicIntent("compare these three vendors in a table")).toBe("synthesis");
  });
});

describe("safeJson", () => {
  it("extracts embedded json", () => {
    expect(safeJson('Sure! {"a":1}')).toEqual({ a: 1 });
    expect(safeJson("nope")).toBeUndefined();
  });
});

describe("briefing", () => {
  it("rejects vague briefings", () => {
    expect(briefingIsVague({ what: "help", goal: "idk" })).toBe(true);
    expect(briefingIsVague({ what: "Compare Jasper AI pricing to ours", goal: "Decide whether to cut our Pro price" })).toBe(false);
  });
  it("applies defaults", () => {
    const b = BriefingSchema.parse({ what: "Compare Jasper AI pricing", goal: "decide on our pricing", condition: {}, execute: {} });
    expect(b.track).toBe("once");
    expect(b.condition.high_stakes).toBe(false);
  });
});

describe("pseudo embeddings", () => {
  it("similar texts are closer", () => {
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    const a = pseudoEmbed("jasper ai pricing plans monthly cost");
    const b = pseudoEmbed("jasper pricing monthly plans");
    const c = pseudoEmbed("chocolate cake recipe with butter");
    expect(dot(a, b)).toBeGreaterThan(dot(a, c));
  });
});
