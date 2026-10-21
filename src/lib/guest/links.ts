import { SITE_URL } from "@/lib/site";

// The addresses of the guest pages. The invitation URL is also what the QR pass
// carries, and the check-in screen reads the token from its last path segment,
// so keep it exactly `<SITE_URL>/i/<token>`.

const trimSlash = (origin: string) => origin.replace(/\/+$/, "");

/** The public page of an event, for sharing: `<origin>/e/<slug>`. */
export const eventUrl = (slug: string, origin: string = SITE_URL) => `${trimSlash(origin)}/e/${slug}`;

/** The personal invitation of one guest: `<origin>/i/<token>`. */
export const invitationUrl = (token: string, origin: string = SITE_URL) => `${trimSlash(origin)}/i/${token}`;

/** The path of an event's calendar file, relative to the site. */
export const calendarPath = (slug: string) => `/e/${slug}/calendar.ics`;

/** Tokens are long random strings. Anything else cannot belong to a guest, so the database need not be asked. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;
export const looksLikeToken = (value: string) => TOKEN_SHAPE.test(value);

/** Same idea for event addresses: lowercase words joined by single hyphens, 3 to 40 characters. */
const SLUG_SHAPE = /^(?=.{3,40}$)[a-z0-9]+(-[a-z0-9]+)*$/;
export const looksLikeSlug = (value: string) => SLUG_SHAPE.test(value);

/** A Google Maps search for the venue. It opens the Maps app on a phone. Null when the event has no venue. */
export function mapsUrl(venueName: string | null, venueAddress: string | null): string | null {
  const query = [venueName, venueAddress]
    .map((part) => part?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
