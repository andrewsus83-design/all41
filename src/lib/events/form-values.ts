import type { EventRecord } from "./records";
import type { EventType } from "./schema";
import { slugify } from "./slug";
import { THEME_PRESETS, type ThemeFont, type ThemePreset } from "./theme";
import { DEFAULT_TIMEZONE, utcToZonedInput } from "./time";

/** The event form as a person fills it in: every field is text. */
export interface EventFormValues {
  name: string;
  type: EventType;
  slug: string;
  timezone: string;
  /** Wall-clock text in the event's time zone, as a datetime-local field holds it. */
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
  themePreset: ThemePreset;
  /** Empty means the preset's own accent. */
  themeAccent: string;
  themeFont: ThemeFont;
}

export function newEventValues(): EventFormValues {
  return {
    name: "",
    type: "corporate",
    slug: "",
    timezone: DEFAULT_TIMEZONE,
    startsAt: "",
    endsAt: "",
    venueName: "",
    venueAddress: "",
    themePreset: "midnight",
    themeAccent: "",
    themeFont: "modern",
  };
}

export function valuesFromEvent(event: EventRecord): EventFormValues {
  return {
    name: event.name,
    type: event.type,
    slug: event.slug,
    timezone: event.timezone,
    startsAt: utcToZonedInput(event.startsAt, event.timezone),
    endsAt: utcToZonedInput(event.endsAt, event.timezone),
    venueName: event.venueName ?? "",
    venueAddress: event.venueAddress ?? "",
    themePreset: event.theme.preset,
    themeAccent: event.theme.accent ?? "",
    themeFont: event.theme.font,
  };
}

/** The address to suggest for an event name, until the person types their own. */
export const suggestSlug = slugify;

/** The accent a theme shows when none is chosen. */
export const presetAccent = (preset: ThemePreset) => THEME_PRESETS[preset].accent;
