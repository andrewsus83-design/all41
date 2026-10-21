import { getCachedPublicEvent } from "@/lib/guest/cached";
import { buildCalendar, calendarFileName } from "@/lib/guest/ics";
import { eventUrl } from "@/lib/guest/links";

/** The event as a calendar file, for "Add to calendar". Only for a published event; anything else is a plain 404. */
export async function GET(_request: Request, context: RouteContext<"/e/[slug]/calendar.ics">) {
  const { slug } = await context.params;
  const event = await getCachedPublicEvent(slug);
  if (!event) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const body = buildCalendar({
    uid: `${event.slug}@all41.app`,
    name: event.name,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    url: eventUrl(event.slug),
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${calendarFileName(event.slug)}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
