import { TIMEZONES, formatEventDay } from "@/lib/events/time";

/** "19:42" in the given time zone. */
export function clock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}

/** "WIB" for Jakarta, "UTC+8" for Singapore: what a guest reads next to a time. */
export function timeZoneShortName(timeZone: string): string {
  const label = TIMEZONES.find((zone) => zone.id === timeZone)?.label ?? "";
  const named = /\(([A-Z]{3,5}),/.exec(label)?.[1];
  if (named) return named;
  return /\((UTC[+-]\d+)\)/.exec(label)?.[1] ?? timeZone.replace(/_/g, " ");
}

/** "Saturday 5 December 2026" and "18:00 to 22:00 WIB", in the event's own time zone. */
export function eventWhen(startsAt: string, endsAt: string, timeZone: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = formatEventDay(start, timeZone) === formatEventDay(end, timeZone);
  const zone = timeZoneShortName(timeZone);
  return {
    day: formatEventDay(start, timeZone),
    time: sameDay
      ? `${clock(start, timeZone)} to ${clock(end, timeZone)} ${zone}`
      : `${clock(start, timeZone)} ${zone}, until ${formatEventDay(end, timeZone)}, ${clock(end, timeZone)} ${zone}`,
    /** The same, on one line, for descriptions and link previews. */
    summary: sameDay
      ? `${formatEventDay(start, timeZone)}, ${clock(start, timeZone)} to ${clock(end, timeZone)} ${zone}`
      : `${formatEventDay(start, timeZone)}, ${clock(start, timeZone)} ${zone} to ${formatEventDay(end, timeZone)}, ${clock(end, timeZone)} ${zone}`,
  };
}

/** "Dewi Lestari" becomes "Dewi", for a greeting. A one-word name stays whole. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** "1 guest" or "3 guests": how many people an answer covers. */
export const partyLabel = (size: number) => (size === 1 ? "Just you" : `${size} people`);
