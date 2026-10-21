/** Time zones offered when creating an event: Southeast Asia first, where all41 starts. */
export const TIMEZONES = [
  { id: "Asia/Jakarta", label: "Western Indonesia (WIB, UTC+7)" },
  { id: "Asia/Makassar", label: "Central Indonesia (WITA, UTC+8)" },
  { id: "Asia/Jayapura", label: "Eastern Indonesia (WIT, UTC+9)" },
  { id: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { id: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (UTC+8)" },
  { id: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { id: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (UTC+7)" },
  { id: "Asia/Manila", label: "Manila (UTC+8)" },
] as const;

export const DEFAULT_TIMEZONE = "Asia/Jakarta";
export const TIMEZONE_IDS = TIMEZONES.map((zone) => zone.id) as [string, ...string[]];

const LOCAL_FORMAT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Minutes the zone is ahead of UTC at the given instant. */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

/**
 * Reads what a person typed into a datetime-local field ("2026-12-05T18:00")
 * as a wall-clock time in `timeZone` and returns the instant it means.
 * Null when the text is not a real date and time or the zone is unknown.
 */
export function zonedTimeToUtc(local: string, timeZone: string): Date | null {
  const match = LOCAL_FORMAT.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);

  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(guess);
  // Date.UTC rolls over impossible dates such as the 31st of February.
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) return null;

  try {
    // A second pass settles on the right offset around a daylight saving change.
    const first = guess - offsetMinutes(guess, timeZone) * 60_000;
    return new Date(guess - offsetMinutes(first, timeZone) * 60_000);
  } catch {
    return null;
  }
}

/** The value for a datetime-local field showing `instant` as wall-clock time in `timeZone`. */
export function utcToZonedInput(instant: Date | string, timeZone: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const local = new Date(date.getTime() + offsetMinutes(date.getTime(), timeZone) * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Moves a datetime-local value forward by whole minutes, ignoring time zones: "2026-12-05T18:00" + 180 is "2026-12-05T21:00". Null when the text is not a date and time. */
export function addMinutesToLocal(local: string, minutes: number): string | null {
  const match = LOCAL_FORMAT.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day, hour, minute) + minutes * 60_000);
  return moved.toISOString().slice(0, 16);
}

/** Built from parts, because the order and commas of a whole formatted date differ between ICU versions. */
function dayLabel(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("weekday")} ${value("day")} ${value("month")} ${value("year")}`;
}

/** "Saturday 5 December 2026" in the event's own time zone. */
export function formatEventDay(instant: Date | string, timeZone: string): string {
  return dayLabel(new Date(instant), timeZone);
}

function timeLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "Saturday 5 December 2026, 18:00 to 22:00" in the event's own time zone. */
export function formatEventRange(startsAt: Date | string, endsAt: Date | string, timeZone: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startDay = dayLabel(start, timeZone);
  const endDay = dayLabel(end, timeZone);
  return startDay === endDay
    ? `${startDay}, ${timeLabel(start, timeZone)} to ${timeLabel(end, timeZone)}`
    : `${startDay}, ${timeLabel(start, timeZone)} to ${endDay}, ${timeLabel(end, timeZone)}`;
}
