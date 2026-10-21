// The calendar file behind "Add to calendar" (RFC 5545). One event, no alarms,
// times in UTC so every calendar app shows it in the guest's own zone.

export interface CalendarEvent {
  /** Stable across downloads, so a calendar updates the entry instead of duplicating it. */
  uid: string;
  name: string;
  startsAt: Date | string;
  endsAt: Date | string;
  venueName: string | null;
  venueAddress: string | null;
  /** The page the guest can open to see the event again. */
  url?: string;
  /** When the file was made. Defaults to now; tests pass a fixed one. */
  now?: Date;
}

/** "20261205T110000Z" */
function utcStamp(instant: Date | string): string {
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Text values escape backslash, semicolon, comma and line breaks. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n|\r/g, "\\n");
}

/** Lines are folded at 75 octets, continuation lines start with one space. Never splits a UTF-8 character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // the first line may use 75 octets, each continuation 74 after its leading space
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** The text of a `.ics` file for one event. Lines end in CRLF, as the format requires. */
export function buildCalendar(event: CalendarEvent): string {
  const location = [event.venueName, event.venueAddress]
    .map((part) => part?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//all41//event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.now ?? new Date())}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.name)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(event.url ? [`URL:${event.url}`, `DESCRIPTION:${escapeText(`Details and your invitation: ${event.url}`)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A safe file name for the download: "annual-gala.ics". */
export const calendarFileName = (slug: string) => `${slug}.ics`;
