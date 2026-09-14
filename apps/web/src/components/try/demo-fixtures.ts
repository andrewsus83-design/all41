import type { RunFrame } from "@/components/apps/types";
import { DEMO_RESULTS } from "@/content/demo-results";

/** One coherent dummy world so nothing reads as disconnected filler. */
export const PERSONA = {
  site: "riverside-ceramics.com",
  brand: "Riverside Ceramics",
  goal: "more local customers",
  rivals: "claybarn.co, potterly.com",
  appName: "Riverside SEO check",
};

/** The deliverable — the same dummy SEO report the gallery demo uses. */
export const SEO_RESULT = DEMO_RESULTS["seo-geo-optimizer"].result;

/** The scripted run: raw frames replayed on timers into the REAL RunProgress (crew.agent folds to one row each). */
export const SEO_SCRIPT: { delay: number; frame: RunFrame }[] = [
  { delay: 400, frame: { step: "start", taskId: "demo", preview: true } },
  { delay: 650, frame: { step: "data", sources: 3, chars: 0 } },
  { delay: 500, frame: { step: "step", id: "audit", kind: "crew", label: "audit", phase: "running", billedUsd: 0, billedSoFar: 0 } },
  { delay: 550, frame: { step: "crew.agent", id: "crawler", name: "Crawler", label: "Reading your site", phase: "running", billedSoFar: 0 } },
  { delay: 900, frame: { step: "crew.agent", id: "crawler", name: "Crawler", label: "Reading your site", phase: "done", billedSoFar: 0.01, findings: 6 } },
  { delay: 250, frame: { step: "crew.agent", id: "technical", name: "Technical Auditor", label: "Checking the tech", phase: "running", billedSoFar: 0.01 } },
  { delay: 250, frame: { step: "crew.agent", id: "keyword", name: "Keyword Analyst", label: "Finding keyword gaps", phase: "running", billedSoFar: 0.01 } },
  { delay: 250, frame: { step: "crew.agent", id: "competitor", name: "Competitor Analyst", label: "Comparing competitors", phase: "running", billedSoFar: 0.01 } },
  { delay: 250, frame: { step: "crew.agent", id: "social", name: "Social Analyst", label: "Assessing social presence", phase: "running", billedSoFar: 0.01 } },
  { delay: 950, frame: { step: "crew.agent", id: "technical", name: "Technical Auditor", label: "Checking the tech", phase: "done", billedSoFar: 0.02, findings: 3 } },
  { delay: 500, frame: { step: "crew.agent", id: "keyword", name: "Keyword Analyst", label: "Finding keyword gaps", phase: "done", billedSoFar: 0.03, findings: 5 } },
  { delay: 500, frame: { step: "crew.agent", id: "competitor", name: "Competitor Analyst", label: "Comparing competitors", phase: "done", billedSoFar: 0.03, findings: 4 } },
  { delay: 450, frame: { step: "crew.agent", id: "social", name: "Social Analyst", label: "Assessing social presence", phase: "done", billedSoFar: 0.04, findings: 2 } },
  { delay: 500, frame: { step: "crew.agent", id: "geo", name: "GEO Analyst", label: "Testing AI-search visibility", phase: "running", billedSoFar: 0.04 } },
  { delay: 1000, frame: { step: "crew.agent", id: "geo", name: "GEO Analyst", label: "Testing AI-search visibility", phase: "done", billedSoFar: 0.05, findings: 3 } },
  { delay: 450, frame: { step: "crew.agent", id: "prioritizer", name: "Report Writer", label: "Writing your plan", phase: "running", billedSoFar: 0.05 } },
  { delay: 1100, frame: { step: "crew.agent", id: "prioritizer", name: "Report Writer", label: "Writing your plan", phase: "done", billedSoFar: 0.06, findings: 0 } },
  { delay: 550, frame: { step: "crew.gate", verdict: "supported", conflicts: 0 } },
  { delay: 500, frame: { step: "step", id: "audit", kind: "crew", label: "audit", phase: "done", billedUsd: 0.06, billedSoFar: 0.06 } },
  { delay: 500, frame: { step: "done", taskId: "demo", billedUsd: 0.06, balance: 4.94 } },
];

export const RUN_COST = 0.06;
export const START_CREDIT = 5.0;
