import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { getCurrentUser } from "@/lib/auth/session";
import { getEvent, listAllGuests } from "@/lib/events/queries";
import { GUEST_STATUS_LABELS } from "@/lib/events/records";

/** The guest list as a spreadsheet. Row level security decides what the signed-in person may read. */
export async function GET(_request: Request, context: RouteContext<"/dashboard/events/[eventId]/guests/export">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in to download the guest list.", { status: 401 });

  const { eventId } = await context.params;
  const event = await getEvent(eventId);
  if (!event) return new NextResponse("Event not found.", { status: 404 });

  const guests = await listAllGuests(eventId);
  const csv = toCsv([
    ["Name", "Email", "Phone", "Tags", "Table", "Status"],
    ...guests.map((guest) => [
      guest.name,
      guest.email,
      guest.phone,
      guest.tags.join("; "),
      guest.tableNo,
      GUEST_STATUS_LABELS[guest.status],
    ]),
  ]);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-guests.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
