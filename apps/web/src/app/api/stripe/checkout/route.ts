import { primeSecrets } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { env } from "@/lib/env";

const MIN_USD = 5;
const MAX_USD = 500;

/** POST /api/stripe/checkout — body {amountUsd}. Creates a one-time Checkout Session for a credit top-up. */
export async function POST(request: Request) {
  await primeSecrets();
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: "Payments not configured yet" }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: { amountUsd?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const amountUsd = Number(body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD || amountUsd > MAX_USD) {
    return Response.json({ error: `amountUsd must be between ${MIN_USD} and ${MAX_USD}` }, { status: 400 });
  }
  const amountCents = Math.round(amountUsd * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: "all41 credit top-up", description: `$${(amountCents / 100).toFixed(2)} of task credit` },
        },
      },
    ],
    metadata: { user_id: user.id, amount_usd: (amountCents / 100).toFixed(2) },
    payment_intent_data: { metadata: { user_id: user.id, amount_usd: (amountCents / 100).toFixed(2) } },
    success_url: `${env.appUrl}/settings/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/settings/billing?topup=cancel`,
  });

  return Response.json({ url: session.url, sessionId: session.id });
}
