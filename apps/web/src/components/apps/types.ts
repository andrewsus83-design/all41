/** Client-safe shapes shared by Build and My Apps. Keep this file free of server imports. */
import type { RunEvent, StepDescription } from "@/lib/engine/apps";

export type { RunEvent, StepDescription };

export type ConfigQuestion = { key: string; question: string; type: "text" | "choice" | "multi"; options?: string[]; placeholder?: string };

export type Answers = Record<string, string | string[]>;

export type CatalogApp = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string | null;
  tags: string[];
  /** Fill-in-the-blanks sentence with {{key}} placeholders; null → Q&A stepper fallback. */
  briefTemplate: string | null;
  whoFor: string | null;
  isCustom: boolean;
  estCostUsd: number;
  questions: ConfigQuestion[];
  steps: StepDescription[];
  /** true when a step is conditional on `needs_fresh` */
  hasFreshToggle: boolean;
};

export type RunSummary = {
  id: string;
  status: string;
  billed: number;
  createdAt: string;
  completedAt: string | null;
  preview: boolean;
  modelsUsed: string[];
  result: unknown;
  error: string | null;
};

export type InstanceSummary = {
  id: string;
  name: string;
  appName: string;
  appSlug: string;
  icon: string;
  schedule: string;
  outputTarget: string;
  status: string;
  runCount: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastBilled: number | null;
};

export type InstanceData = { file_ids?: string[]; doc_ids?: string[]; sheet_ids?: string[]; note?: string };

export type InstanceDetail = InstanceSummary & {
  config: Record<string, unknown>;
  data: InstanceData;
  questions: ConfigQuestion[];
  steps: StepDescription[];
  hasFreshToggle: boolean;
  estCostUsd: number;
  runs: RunSummary[];
};

export type DataOption = { id: string; label: string; hint?: string };
export type DataLists = { files: DataOption[]; docs: DataOption[]; sheets: DataOption[] };

/** Streamed frames from POST /api/apps/run (engine events + the route's own). */
export type RunFrame =
  | RunEvent
  | { step: "estimate"; billedUsd: number; balance: number }
  | { step: "result"; taskId: string; result: unknown; billedUsd: number };
