import "server-only";
import { checkBalance } from "./gate";
import { logApiUsage, type CallKind } from "./usage";
import { deductCredit } from "./ledger";
import type { Usage } from "./cost";

export type MeteredResult<T> = {
  result: T;
  costUsd: number;
  billedUsd: number;
  balanceAfter: number;
  usageLogId: string;
};

/**
 * The spine loop (Task 1.5): checkBalance → call → logApiUsage → deductCredit → return.
 * Any provider call in the app goes through this. No exceptions.
 */
export async function metered<T>(args: {
  userId: string;
  taskId?: string | null;
  provider: string;
  model: string;
  callKind: CallKind;
  estimatedBilledUsd: number;
  call: () => Promise<{ result: T; usage: Usage; latencyMs: number; costUsd?: number }>;
}): Promise<MeteredResult<T>> {
  await checkBalance(args.userId, args.estimatedBilledUsd);
  let out: Awaited<ReturnType<typeof args.call>>;
  try {
    out = await args.call();
  } catch (err) {
    // failed calls are still metered (some providers bill errors) but billed 0
    await logApiUsage({
      userId: args.userId, taskId: args.taskId, provider: args.provider, model: args.model,
      callKind: args.callKind, usage: {}, status: "error", error: String(err), costUsd: 0,
    });
    throw err;
  }
  const log = await logApiUsage({
    userId: args.userId, taskId: args.taskId, provider: args.provider, model: args.model,
    callKind: args.callKind, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.costUsd,
  });
  const balanceAfter = await deductCredit(args.userId, log.billedUsd, args.taskId, `${args.callKind}:${args.model}`);
  return { result: out.result, costUsd: log.costUsd, billedUsd: log.billedUsd, balanceAfter, usageLogId: log.id };
}
