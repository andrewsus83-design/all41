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
  proposal_report: {
    name: "proposal_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["executive_summary", "compliance_matrix", "proposal_sections", "win_themes", "compliance_summary", "flags", "sources", "confidence"],
      properties: {
        executive_summary: { type: "string" },
        compliance_matrix: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["req_id", "source_section", "requirement", "status", "response_location"],
            properties: {
              req_id: { type: "string" }, source_section: { type: "string", enum: ["L", "M", "SOW", "other"] }, requirement: { type: "string" },
              status: { type: "string", enum: ["compliant", "partial", "missing"] }, response_location: { type: "string" }, evidence: { type: "string" },
            } },
        },
        proposal_sections: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["section", "action_title", "content"],
            properties: { section: { type: "string" }, action_title: { type: "string" }, content: { type: "string" }, covers_req_ids: { type: "array", items: { type: "string" } } } },
        },
        win_themes: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["theme", "hot_button", "discriminator", "proof_point"],
            properties: { theme: { type: "string" }, hot_button: { type: "string" }, discriminator: { type: "string" }, proof_point: { type: "string" } } },
        },
        compliance_summary: {
          type: "object", additionalProperties: false, required: ["total", "compliant", "partial", "missing"],
          properties: { total: { type: "number" }, compliant: { type: "number" }, partial: { type: "number" }, missing: { type: "number" } },
        },
        flags: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  clip_report: {
    name: "clip_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["summary", "clips", "dropped", "render_note", "flags", "sources", "confidence"],
      properties: {
        summary: { type: "string" },
        clips: {
          type: "array",
          items: {
            type: "object", additionalProperties: false,
            required: ["title", "start_sec", "end_sec", "duration_sec", "virality_score", "dimension_scores", "hook_type", "why", "caption", "render_category", "platform_fit", "clip_file", "status"],
            properties: {
              title: { type: "string" },
              start_sec: { type: "number" },
              end_sec: { type: "number" },
              duration_sec: { type: "number" },
              virality_score: { type: "number" },
              dimension_scores: {
                type: "object", additionalProperties: false, required: ["hook", "pacing", "engagement"],
                properties: { hook: { type: "number" }, pacing: { type: "number" }, engagement: { type: "number" } },
              },
              hook_type: { type: "string" },
              why: { type: "string" },
              caption: { type: "string" },
              render_category: { type: "string", enum: ["A", "B"] },
              platform_fit: { type: "array", items: { type: "string" } },
              clip_file: { type: "string" },
              caption_file: { type: "string" },
              status: { type: "string", enum: ["ready", "render_pending"] },
            },
          },
        },
        dropped: {
          type: "array",
          items: { type: "object", additionalProperties: false, required: ["moment", "reason"],
            properties: { moment: { type: "string" }, reason: { type: "string" } } },
        },
        render_note: { type: "string" },
        flags: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  website_report: {
    name: "website_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["live_url", "status", "pages", "style", "seo_geo_baseline", "conversion_notes", "checkout_linked", "render_note", "flags", "sources", "confidence"],
      properties: {
        live_url: { type: "string" },
        status: { type: "string", enum: ["live", "deploy_pending", "failed"] },
        subdomain: { type: "string" },
        pages: {
          type: "array",
          items: {
            type: "object", additionalProperties: false,
            required: ["type", "slug", "headline", "value_prop", "proof", "cta"],
            properties: {
              type: { type: "string" },
              slug: { type: "string" },
              headline: { type: "string" },
              subhead: { type: "string" },
              value_prop: { type: "string" },
              proof: { type: "array", items: { type: "string" } },
              cta: { type: "string" },
              cta_href: { type: "string" },
              has_nav: { type: "boolean" },
            },
          },
        },
        style: {
          type: "object", additionalProperties: false, required: ["palette", "typography", "tone"],
          properties: { palette: { type: "array", items: { type: "string" } }, typography: { type: "string" }, tone: { type: "string" }, layout: { type: "string" } },
        },
        seo_geo_baseline: {
          type: "object", additionalProperties: false, required: ["summary", "schema_present", "geo_notes"],
          properties: { summary: { type: "string" }, schema_present: { type: "boolean" }, geo_notes: { type: "array", items: { type: "string" } } },
        },
        conversion_notes: { type: "array", items: { type: "string" } },
        checkout_linked: { type: "boolean" },
        render_note: { type: "string" },
        flags: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  content_report: {
    name: "content_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["summary", "core", "repurposes", "schedule", "flags", "sources", "confidence"],
      properties: {
        summary: { type: "string" },
        core: {
          type: "object", additionalProperties: false, required: ["title_options", "body", "takeaway"],
          properties: { title_options: { type: "array", items: { type: "string" } }, body: { type: "string" }, takeaway: { type: "string" } },
        },
        repurposes: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["channel", "content", "hook_options"],
            properties: { channel: { type: "string" }, content: { type: "string" }, hook_options: { type: "array", items: { type: "string" } } },
          },
        },
        schedule: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["channel", "when", "piece_ref"],
            properties: { channel: { type: "string" }, when: { type: "string" }, piece_ref: { type: "string" } },
          },
        },
        flags: { type: "array", items: { type: "string" } },
        sources: { type: "array", items: source },
        confidence: { type: "number" },
      },
    },
  },
  competitor_report: {
    name: "competitor_report",
    schema: {
      type: "object", additionalProperties: false,
      required: ["summary", "baseline", "changes", "intel", "battlecards", "trends", "filtered_noise_count", "flags", "sources", "confidence"],
      properties: {
        summary: { type: "string" },
        baseline: { type: "boolean" },
        changes: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["competitor", "signal", "what_changed", "significance", "why_it_matters"],
            properties: {
              competitor: { type: "string" }, signal: { type: "string" }, what_changed: { type: "string" },
              significance: { type: "string", enum: ["high", "medium", "low"] }, why_it_matters: { type: "string" },
            },
          },
        },
        intel: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["competitor", "meaning", "threat_or_opportunity"],
            properties: { competitor: { type: "string" }, meaning: { type: "string" }, likely_reason: { type: "string" }, threat_or_opportunity: { type: "string" } },
          },
        },
        battlecards: {
          type: "array",
          items: {
            type: "object", additionalProperties: false, required: ["competitor", "strengths", "weaknesses", "how_to_win"],
            properties: {
              competitor: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, weaknesses: { type: "array", items: { type: "string" } },
              pricing: { type: "string" }, positioning: { type: "string" }, how_to_win: { type: "array", items: { type: "string" } },
            },
          },
        },
        trends: { type: "array", items: { type: "string" } },
        filtered_noise_count: { type: "number" },
        flags: { type: "array", items: { type: "string" } },
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
