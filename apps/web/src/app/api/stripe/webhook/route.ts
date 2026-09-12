import { primeSecrets } from "@/lib/env";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { grantTopup } from "@/lib/stripe/grant";
import { env } from "@/lib/env";

const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

function paymentRefOf(session: Stripe.Checkout.Session): string {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof pi === "object" && "id" in pi) return pi.id;
  return session.id;
}

function amountUsdOf(session: Stripe.Checkout.Session): number {
  const meta = Number(session.metadata?.amount_usd);
  if (Number.isFinite(meta) && meta > 0) return meta;
  return (session.amount_total ?? 0) / 100;
}

/** POST /api/stripe/webhook — verifies the signature on the raw body, grants credit idempotently. */
export async function POST(request: Request) {
  await primeSecrets();
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    return Response.json({ error: "Payments not configured yet" }, { status: 503 });
  }
  const sig = request.headers.get("stripe-signature");
  if (!sig) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch (err) {
    return Response.json({ error: `Invalid signature: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return Response.json({ received: true, ignored: event.type });

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return Response.json({ received: true, ignored: `payment_status=${session.payment_status}` });
  }
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!userId) return Response.json({ error: "No user_id on session" }, { status: 400 });

  try {
    const result = await grantTopup({
      eventId: event.id,
      eventType: event.type,
      userId,
      amountUsd: amountUsdOf(session),
      paymentRef: paymentRefOf(session),
      note: "stripe top-up",
    });
    if (result.duplicate) return Response.json({ received: true, duplicate: true, reason: result.reason });
    return Response.json({ received: true, granted: true, balanceAfter: result.balanceAfter });
  } catch (err) {
    console.error("[stripe/webhook] grant failed", err);
    // 500 → Stripe retries; grantTopup already rolled back the stripe_events marker.
    return Response.json({ error: "grant failed" }, { status: 500 });
  }
}
