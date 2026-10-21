import { CalendarPlus, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventFacts } from "@/components/guest/event-facts";
import { GuestShell } from "@/components/guest/guest-shell";
import { headingStyle } from "@/components/guest/theme-scope";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/site";
import { getCachedPublicEvent } from "@/lib/guest/cached";
import { eventWhen } from "@/lib/guest/format";
import { calendarPath, eventUrl } from "@/lib/guest/links";

type Props = PageProps<"/e/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);
  // The page itself answers with the not-found screen; this keeps a link preview from naming anything.
  if (!event) return { title: "Page not found", robots: { index: false } };

  const when = eventWhen(event.startsAt, event.endsAt, event.timezone);
  const where = [event.venueName, event.venueAddress].filter(Boolean).join(", ").replace(/\s+/g, " ");
  const description = [when.summary, where].filter(Boolean).join(" · ");
  const url = eventUrl(event.slug);

  return {
    title: event.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title: event.name, description, url },
    twitter: { card: "summary_large_image", title: event.name, description },
  };
}

// A made-up or unpublished address must answer 404, and the status is fixed by the first byte. The page is
// built from one cached read, so it is fully static: a slug nobody asked for yet is rendered once, on its
// first request, which waits for the result (ensureStatic "navigation") instead of streaming a placeholder
// first. That is what lets notFound() answer a real 404. Publishing, unpublishing and edits expire the cache
// tag the read carries (see publicEventTag), and the stored page with it.
export const ensureStatic = "navigation";

// Next needs one sample address to build from. It is not a valid address on purpose, so building the site
// never reads the database; the sample renders the not-found screen.
export function generateStaticParams() {
  return [{ slug: "-" }];
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);
  if (!event) notFound();

  return (
    <GuestShell theme={event.theme}>
      <header className="space-y-4">
        <p className="text-xs font-bold tracking-[0.2em] text-gold uppercase">{event.type === "wedding" ? "Wedding" : "Corporate event"}</p>
        <h1 className="font-display text-4xl leading-tight font-semibold break-words sm:text-5xl" style={headingStyle(event.theme)}>
          {event.name}
        </h1>
      </header>

      <Card className="mt-8 p-6 sm:p-8">
        <EventFacts event={event} />
      </Card>

      <a href={calendarPath(event.slug)} download className={`${buttonStyles({ size: "lg" })} mt-6 w-full`}>
        <CalendarPlus className="size-5" aria-hidden="true" />
        Add to calendar
      </a>

      <Card className="mt-6 flex gap-4 p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold" aria-hidden="true">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">RSVP with your personal link</h2>
          <p className="mt-1 text-muted">
            Your reply and your entry pass live behind the personal link your host sent you, by email or WhatsApp. Open that link to
            confirm you are coming. Cannot find it? Ask your host to send it again.
          </p>
        </div>
      </Card>
    </GuestShell>
  );
}
