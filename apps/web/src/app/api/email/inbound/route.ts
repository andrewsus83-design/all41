import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

/**
 * Inbound email webhook (Resend / Postmark / etc.). Point the provider here.
 * Secured by a shared secret: set EMAIL_INBOUND_SECRET (env) and configure the provider to
 * send it as `x-inbound-secret`. Until it's set the endpoint refuses (501), so it can never
 * be used to inject arbitrary rows.
 */
export async function POST(req: Request) {
  const secret = process.env.EMAIL_INBOUND_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "inbound email not configured" }, { status: 501 });
  if (req.headers.get("x-inbound-secret") !== secret) {
    console.warn("[email/inbound] rejected: bad or missing x-inbound-secret");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = (await req.json()) as Record<string, unknown>; } catch { return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 }); }

  const from = String(payload.from ?? payload.From ?? payload.sender ?? "");
  const to = String(payload.to ?? payload.To ?? payload.recipient ?? "");
  const subject = String(payload.subject ?? payload.Subject ?? "");
  const body = String(payload.text ?? payload.body ?? payload.TextBody ?? payload.html ?? "").slice(0, 20000);

  const { error } = await adminClient().from("inbox_messages").insert({
    direction: "inbound", from_email: from || null, to_email: to || null, subject: subject || null, body: body || null,
    status: "unread", meta: { provider: req.headers.get("x-provider") ?? null } as unknown as Json,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
