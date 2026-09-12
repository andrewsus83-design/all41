import "server-only";
import { getBalance, InsufficientCreditError } from "./ledger";

/**
 * Pre-flight balance gate (Task 1.2). Every task must pass this before ANY provider call.
 * Blocks with a clear "top up to continue" error when insufficient.
 */
export async function checkBalance(userId: string, estimatedCostUsd: number) {
  const balance = await getBalance(userId);
  if (balance < estimatedCostUsd) {
    throw new InsufficientCreditError(balance, estimatedCostUsd);
  }
  return { ok: true as const, balance, estimated: estimatedCostUsd };
}

export function insufficientMessage(e: InsufficientCreditError) {
  return `Not enough credit. Balance $${e.balance.toFixed(2)}, this needs about $${e.needed.toFixed(4)}. Top up to continue.`;
}
