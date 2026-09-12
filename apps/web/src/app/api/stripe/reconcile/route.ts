import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { grantTopup, paymentAlreadyGranted } from "@/lib/stripe/grant";
import { isCronAuthorized, cronUnauthorized } from "@/lib/jobs/cronAuth";

export const maxDuration = 120;

const LOOKBACK_DAYS = 3;

/**
 * POST /api/stripe/reconcile — the paid-but-webhook-failed safety net (Task 1.4).
 * Lists completed Checkout Sessions from the last 3 days and grants any paid session whose
 * payment_intent is not yet in credit_ledger. Safe to run repeatedly.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const stripe = getStripe();
  if (!stripe) return Response.json({ ok: true, skipped: "Payments not configured yet", granted: [] });

  const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
  const granted: Array<{ session: string; userId: string; amountUsd: number }> = [];
  const skipped: Array<{ session: string; reason: string }> = [];
  let scanned = 0;

  for await (const session of stripe.checkout.sessions.list({ created: { gte: since }, status: "complete", limit: 100 })) {
    scanned++;
    const s = session as Stripe.Checkout.Session;
    if (s.mode !== "payment" || s.payment_status !== "paid") {
      skipped.push({ session: s.id, reason: `mode=${s.mode} payment_status=${s.payment_status}` });
      continue;
    }
    const userId = s.metadata?.user_id ?? s.client_reference_id;
    if (!userId) {
      skipped.push({ session: s.id, reason: "no user_id" });
      continue;
    }
    const paymentRef = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? s.id;
    if (await paymentAlreadyGranted(paymentRef)) continue;

    const meta = Number(s.metadata?.amount_usd);
    const amountUsd = Number.isFinite(meta) && meta > 0 ? meta : (s.amount_total ?? 0) / 100;
    try {
      const r = await grantTopup({
        eventId: `reconcile:${s.id}`,
        eventType: "reconcile.checkout.session",
        userId,
        amountUsd,
        paymentRef,
        note: "stripe top-up (reconciled)",
      });
      if (r.granted) granted.push({ session: s.id, userId, amountUsd });
      else skipped.push({ session: s.id, reason: `duplicate:${r.reason}` });
    } catch (err) {
      skipped.push({ session: s.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ ok: true, scanned, granted, skipped });
}
