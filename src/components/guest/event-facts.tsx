import { CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { eventWhen } from "@/lib/guest/format";
import { mapsUrl } from "@/lib/guest/links";
import type { PublicEvent } from "@/lib/guest/records";

/** When and where, with the directions link. Shared by the event page and the invitation. */
export function EventFacts({ event, directions = true }: { event: PublicEvent; directions?: boolean }) {
  const when = eventWhen(event.startsAt, event.endsAt, event.timezone);
  const maps = mapsUrl(event.venueName, event.venueAddress);

  return (
    <div className="space-y-5">
      <ul className="space-y-4">
        <li className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold" aria-hidden="true">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-subtle uppercase">Date</p>
            <p className="font-medium">{when.day}</p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold" aria-hidden="true">
            <Clock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-widest text-subtle uppercase">Time</p>
            <p className="font-medium">{when.time}</p>
          </div>
        </li>
        {(event.venueName || event.venueAddress) && (
          <li className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold" aria-hidden="true">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest text-subtle uppercase">Where</p>
              {event.venueName && <p className="font-medium break-words">{event.venueName}</p>}
              {event.venueAddress && <p className="whitespace-pre-line text-muted break-words">{event.venueAddress}</p>}
            </div>
          </li>
        )}
      </ul>
      {directions && maps && (
        <a href={maps} target="_blank" rel="noopener noreferrer" className={`${buttonStyles({ variant: "secondary" })} w-full`}>
          <ExternalLink className="size-4" aria-hidden="true" />
          Open in Maps
        </a>
      )}
    </div>
  );
}
