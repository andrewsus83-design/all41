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
  seo_report: {
    name: "seo_geo_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["health_score", "quick_wins", "technical", "keywords_content", "competitors", "geo", "social", "sources", "flags", "confidence"],
      properties: {
        health_score: {
          type: "object", additionalProperties: false, required: ["seo", "geo", "change_since_last"],
          properties: { seo: { type: "number" }, geo: { type: "number" }, change_since_last: { type: "string" } },
        },
        quick_wins: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["action", "why", "expected_impact"],
            properties: { action: { type: "string" }, why: { type: "string" }, expected_impact: { type: "string" } } },
        },
        technical: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["issue", "severity", "fix"],
            properties: { issue: { type: "string" }, severity: { type: "string", enum: ["error", "warning", "notice"] }, fix: { type: "string" }, affected_pages: { type: "array", items: { type: "string" } } } },
        },
        keywords_content: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["keyword", "intent", "recommendation"],
            properties: { keyword: { type: "string" }, intent: { type: "string" }, recommendation: { type: "string" } } },
        },
        competitors: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["competitor", "gap", "how_to_close"],
            properties: { competitor: { type: "string" }, gap: { type: "string" }, how_to_close: { type: "string" } } },
        },
        geo: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["factor", "status", "fix"],
            properties: { factor: { type: "string" }, status: { type: "string" }, fix: { type: "string" } } },
        },
        social: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["platform", "recommendation"],
            properties: { platform: { type: "string" }, recommendation: { type: "string" } } },
        },
        sources: { type: "array", items: source },
        flags: { type: "array", items: { type: "string" } },
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
