/** Structured output schemas (anti-hallucination layer 4): required `sources` + `confidence`. */
const source = {
  type: "object", additionalProperties: false, required: ["ref", "quote"],
  properties: { ref: { type: "string" }, quote: { type: "string" } },
};

export const OUTPUT_SCHEMAS = {
  answer: {
    name: "answer",
    schema: {
      type: "object", additionalProperties: false,
      required: ["title", "answer", "key_points", "next_action", "sources", "confidence", "gaps"],
      properties: {
        title: { type: "string" },
        answer: { type: "string" },
        key_points: { type: "array", items: { type: "string" } },
        next_action: { type: "string" },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
        gaps: { type: "array", items: { type: "string" } },
      },
    },
  },
  briefing: {
    name: "morning_briefing",
    schema: {
      type: "object", additionalProperties: false,
      required: ["title", "items", "sources", "confidence"],
      properties: {
        title: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["headline", "why_it_matters", "action"],
            properties: { headline: { type: "string" }, why_it_matters: { type: "string" }, action: { type: "string" } },
          },
        },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  report: {
    name: "comparison_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["title", "summary", "table", "threats", "opportunities", "next_move", "sources", "confidence"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        table: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["dimension", "them", "you"],
            properties: { dimension: { type: "string" }, them: { type: "string" }, you: { type: "string" } },
          },
        },
        threats: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        next_move: { type: "string" },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  content_pack: {
    name: "content_pack",
    schema: {
      type: "object", additionalProperties: false,
      required: ["title", "drafts", "sources", "confidence"],
      properties: {
        title: { type: "string" },
        drafts: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["platform", "hook", "body", "cta"],
            properties: { platform: { type: "string" }, hook: { type: "string" }, body: { type: "string" }, cta: { type: "string" } },
          },
        },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  verification: {
    name: "verification",
    schema: {
      type: "object", additionalProperties: false,
      required: ["verdict", "conflicts", "unsupported_claims", "confidence"],
      properties: {
        verdict: { type: "string", enum: ["supported", "partially_supported", "conflicts_found"] },
        conflicts: { type: "array", items: { type: "string" } },
        unsupported_claims: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
      },
    },
  },
} as const;

export type OutputSchemaKey = keyof typeof OUTPUT_SCHEMAS;
