/** Tool-sprawl strip — monthly list prices from Master Plan §2 (2026). Illustrative of a typical solo-operator stack. */
export type SprawlTool = { id: string; name: string; monthlyUsd: number; replacedBy: string };

export const SPRAWL_TOOLS: SprawlTool[] = [
  { id: "chatgpt", name: "ChatGPT", monthlyUsd: 20, replacedBy: "chat" },
  { id: "claude", name: "Claude", monthlyUsd: 20, replacedBy: "chat" },
  { id: "perplexity", name: "Perplexity", monthlyUsd: 20, replacedBy: "research" },
  { id: "jasper", name: "Jasper", monthlyUsd: 49, replacedBy: "Content Pipeline" },
  { id: "semrush", name: "SEMrush", monthlyUsd: 129, replacedBy: "Competitor Crawler" },
  { id: "zapier", name: "Zapier", monthlyUsd: 30, replacedBy: "routines" },
  { id: "mailchimp", name: "Mailchimp", monthlyUsd: 13, replacedBy: "Email Campaign (coming)" },
  { id: "otter", name: "Otter", monthlyUsd: 16, replacedBy: "Meeting Notes (coming)" },
];

export const SPRAWL_TOTAL_USD = SPRAWL_TOOLS.reduce((n, t) => n + t.monthlyUsd, 0);

/** Typical selling price per task (Master Plan §6). */
export const TASK_PRICE_USD = { light: 0.05, standard: 0.12, heavy: 0.25 } as const;
export type TaskWeight = keyof typeof TASK_PRICE_USD;

export const TOP_UP_AMOUNTS_USD = [5, 10, 25] as const;
export const FREE_CREDIT_USD = 2;
