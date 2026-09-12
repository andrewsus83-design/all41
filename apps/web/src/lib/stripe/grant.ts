import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { applyCredit } from "@/lib/finance/ledger";

export type GrantTopupInput = {
  /** Stripe event id (evt_…) or a synthetic id for reconciliation ("reconcile:cs_…"). */
  eventId: string;
  eventType?: string;
  userId: string;
  amountUsd: number;
  /** Stripe payment_intent id (preferred) or checkout session id — lands in credit_ledger.stripe_payment_id. */
  paymentRef: string;
  note?: string;
};

export type GrantTopupResult =
  | { granted: true; duplicate: false; balanceAfter: number }
  | { granted: false; duplicate: true; reason: "event" | "payment" };

/**
 * Idempotent top-up grant — the unit-testable core of the webhook (Task 1.4).
 *
 * Two independent guards:
 *  1. `stripe_events.id` primary key — the same Stripe event delivered twice grants once.
 *  2. `credit_ledger.stripe_payment_id` unique index — a *different* event (or a reconcile pass)
 *     for the same payment also grants once.
 *
 * On any non-duplicate failure the stripe_events row is removed again so Stripe (or reconcile) retries.
 */
export async function grantTopup(input: GrantTopupInput): Promise<GrantTopupResult> {
  const db = adminClient();
  if (!(input.amountUsd > 0)) throw new Error("INVALID_TOPUP_AMOUNT");

  const { error: evErr } = await db
    .from("stripe_events")
    .insert({ id: input.eventId, type: input.eventType ?? "checkout.session.completed" });
  if (evErr) {
    if (evErr.code === "23505") return { granted: false, duplicate: true, reason: "event" };
    throw new Error(`stripe_events insert failed: ${evErr.message}`);
  }

  try {
    const balanceAfter = await applyCredit(input.userId, "topup", input.amountUsd, {
      stripePaymentId: input.paymentRef,
      note: input.note ?? "stripe top-up",
    });
    return { granted: true, duplicate: false, balanceAfter };
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_STRIPE_PAYMENT") {
      // The payment is already in the ledger — keep the event row (it *is* processed) and report duplicate.
      return { granted: false, duplicate: true, reason: "payment" };
    }
    // Roll back the event marker so a retry can succeed.
    await db.from("stripe_events").delete().eq("id", input.eventId);
    throw err;
  }
}

/** True when a payment ref is already granted in the ledger (used by reconcile). */
export async function paymentAlreadyGranted(paymentRef: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("credit_ledger")
    .select("id")
    .eq("stripe_payment_id", paymentRef)
    .limit(1);
  if (error) throw new Error(`credit_ledger read failed: ${error.message}`);
  return (data ?? []).length > 0;
}
