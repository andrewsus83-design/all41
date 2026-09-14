"use server";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/** A user reports a bug / gives feedback → lands in the admin Inbox as an inbound message. */
export async function submitReport(text: string): Promise<{ ok: boolean; message: string }> {
  const { user } = await requireUser();
  const body = text.trim();
  if (!body) return { ok: false, message: "Please write something first." };
  const { error } = await adminClient().from("inbox_messages").insert({
    direction: "inbound",
    from_email: user.email ?? null,
    subject: "Report / feedback from the app",
    body: body.slice(0, 4000),
    status: "unread",
    user_id: user.id,
  });
  if (error) return { ok: false, message: "Couldn't send — try again." };
  return { ok: true, message: "Thanks — we got it." };
}
