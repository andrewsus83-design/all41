import "server-only";
import { adminClient } from "@/lib/supabase/admin";

export type LedgerType = "topup" | "deduct" | "grant" | "refund";

export class InsufficientCreditError extends Error {
  constructor(public balance: number, public needed: number) {
    super("INSUFFICIENT_CREDIT");
  }
}

/** Fast balance read from the row-locked cache table (Task 1.1). */
export async function getBalance(userId: string): Promise<number> {
  const { data, error } = await adminClient().rpc("credit_balance", { p_user_id: userId });
  if (error) throw new Error(`credit_balance failed: ${error.message}`);
  return Number(data ?? 0);
}

/** Atomic ledger write via credit_apply() — returns balance_after. */
export async function applyCredit(
  userId: string,
  type: LedgerType,
  amountUsd: number,
  opts: { taskId?: string | null; stripePaymentId?: string | null; note?: string | null } = {},
): Promise<number> {
  const amount = round6(amountUsd);
  const { data, error } = await adminClient().rpc("credit_apply", {
    p_user_id: userId,
    p_type: type,
    p_amount: amount,
    p_task_id: opts.taskId ?? undefined,
    p_stripe_payment_id: opts.stripePaymentId ?? undefined,
    p_note: opts.note ?? undefined,
  });
  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDIT")) {
      const bal = await getBalance(userId);
      throw new InsufficientCreditError(bal, amount);
    }
    if (error.message.includes("ledger_stripe_uidx") || error.code === "23505") {
      throw new Error("DUPLICATE_STRIPE_PAYMENT");
    }
    throw new Error(`credit_apply failed: ${error.message}`);
  }
  return Number(data);
}

export const deductCredit = (userId: string, amountUsd: number, taskId?: string | null, note?: string) =>
  applyCredit(userId, "deduct", amountUsd, { taskId, note });

export function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
