import { inngest } from "./inngest";
import { selectDueInstances, runInstanceSafely, type DueInstanceRun } from "./instances";

/** Task 3.3 — every 5 minutes, run instances whose next_run_at has passed. Each run is its own step. */
export const runDueInstances = inngest.createFunction(
  { id: "run-due-instances", concurrency: { limit: 1 }, triggers: [{ cron: "*/5 * * * *" }] },
  async ({ step }) => {
    const ids = await step.run("select-due", () => selectDueInstances(20));
    const runs: DueInstanceRun[] = [];
    for (const id of ids) {
      runs.push(await step.run(`run-${id}`, () => runInstanceSafely(id)));
    }
    return { due: ids.length, runs };
  },
);
