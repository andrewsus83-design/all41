/** Task 1.4 — top-up grant is idempotent two ways (event id AND payment ref), no Stripe needed (live DB). */
import { describe, it, expect } from "vitest";
import { adminClient } from "@/lib/supabase/admin";
import { getBalance } from "@/lib/finance/ledger";
import { grantTopup, paymentAlreadyGranted } from "@/lib/stripe/grant";

const USER = "11111111-1111-1111-1111-111111111111";
const run = Date.now();

describe("stripe top-up grant (grantTopup)", () => {
  it("same eventId delivered twice grants exactly once and raises balance by exactly the amount", async () => {
    const eventId = `evt_test_${run}_a`;
    const paymentRef = `pi_test_${run}_a`;
    const amount = 7.25;
    const before = await getBalance(USER);

    const first = await grantTopup({ eventId, eventType: "checkout.session.completed", userId: USER, amountUsd: amount, paymentRef });
    expect(first.granted).toBe(true);
    if (first.granted) expect(first.balanceAfter).toBeCloseTo(before + amount, 6);

    const second = await grantTopup({ eventId, eventType: "checkout.session.completed", userId: USER, amountUsd: amount, paymentRef });
    expect(second.granted).toBe(false);
    expect(second.duplicate).toBe(true);
    if (!second.granted) expect(second.reason).toBe("event");

    const after = await getBalance(USER);
    expect(after - before).toBeCloseTo(amount, 6);

    const db = adminClient();
    const { data: ledger } = await db.from("credit_ledger").select("id,amount_usd,type").eq("stripe_payment_id", paymentRef);
    expect(ledger!.length).toBe(1);
    expect(ledger![0].type).toBe("topup");
    expect(Number(ledger![0].amount_usd)).toBeCloseTo(amount, 6);
    const { data: ev } = await db.from("stripe_events").select("id").eq("id", eventId);
    expect(ev!.length).toBe(1);
  });

  it("a NEW eventId with the SAME paymentRef also grants only once (ledger unique index)", async () => {
    const paymentRef = `pi_test_${run}_b`;
    const amount = 12.5;
    const before = await getBalance(USER);

    const r1 = await grantTopup({ eventId: `evt_test_${run}_b1`, userId: USER, amountUsd: amount, paymentRef });
    expect(r1.granted).toBe(true);
    expect(await paymentAlreadyGranted(paymentRef)).toBe(true);

    const r2 = await grantTopup({ eventId: `evt_test_${run}_b2`, userId: USER, amountUsd: amount, paymentRef });
    expect(r2.granted).toBe(false);
    if (!r2.granted) expect(r2.reason).toBe("payment");

    // reconcile-style synthetic event id for the same payment → still no double grant
    const r3 = await grantTopup({ eventId: `reconcile:cs_test_${run}_b`, userId: USER, amountUsd: amount, paymentRef });
    expect(r3.granted).toBe(false);

    const after = await getBalance(USER);
    expect(after - before).toBeCloseTo(amount, 6);
    const { data: ledger } = await adminClient().from("credit_ledger").select("id").eq("stripe_payment_id", paymentRef);
    expect(ledger!.length).toBe(1);
  });

  it("rejects a non-positive amount without touching stripe_events", async () => {
    const eventId = `evt_test_${run}_c`;
    await expect(grantTopup({ eventId, userId: USER, amountUsd: 0, paymentRef: `pi_test_${run}_c` })).rejects.toThrow("INVALID_TOPUP_AMOUNT");
    const { data: ev } = await adminClient().from("stripe_events").select("id").eq("id", eventId);
    expect(ev!.length).toBe(0);
  });
});
