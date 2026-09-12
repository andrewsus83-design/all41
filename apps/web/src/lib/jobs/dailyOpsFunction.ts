import { inngest } from "./inngest";
import { runDailyOpsWith } from "./dailyOps";

/** Task 4.4 — 22:00 UTC = 05:00 Asia/Jakarta. One function, sequential steps mirroring the plan's 5:00→6:15 chain. */
export const dailyOps = inngest.createFunction(
  { id: "daily-ops", concurrency: { limit: 1 }, retries: 1, triggers: [{ cron: "0 22 * * *" }] },
  async ({ step }) =>
    // step results are plain JSON objects, so Inngest's Jsonify<T> round-trip is identity here
    runDailyOpsWith(async <T,>(name: string, fn: () => Promise<T>) => (await step.run(name, fn)) as T),
);
