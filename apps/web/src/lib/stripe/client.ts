import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Lazy Stripe client (Task 1.4). Uses the installed SDK's default apiVersion.
 * Returns null when STRIPE_SECRET_KEY is empty so callers can degrade to 503 instead of crashing at import time.
 */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  if (!_stripe) _stripe = new Stripe(env.stripeSecretKey);
  return _stripe;
}

export function stripeConfigured() {
  return env.stripeSecretKey.length > 0;
}
