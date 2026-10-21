import { z } from "zod";
import { slugSchema } from "./slug";
import { THEME_FONT_IDS, THEME_PRESET_IDS, accentProblem, hexColorSchema, type EventTheme } from "./theme";
import { TIMEZONE_IDS, zonedTimeToUtc } from "./time";

export const EVENT_TYPES = ["corporate", "wedding"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const blankToNull = (value: unknown) => (value == null || (typeof value === "string" && value.trim() === "") ? null : value);

/**
 * The create and edit event form, as the server action reads it. Dates arrive
 * as wall-clock text from datetime-local fields and leave as instants.
 */
export const eventFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the event name.").max(160, "Keep the name under 160 characters."),
    type: z.enum(EVENT_TYPES, "Choose corporate or wedding."),
    slug: slugSchema,
    timezone: z.enum(TIMEZONE_IDS, "Choose a time zone."),
    startsAt: z.string(),
    endsAt: z.string(),
    venueName: z.preprocess(blankToNull, z.string().trim().max(160, "Keep the venue under 160 characters.").nullable()),
    venueAddress: z.preprocess(blankToNull, z.string().trim().max(400, "Keep the address under 400 characters.").nullable()),
    themePreset: z.enum(THEME_PRESET_IDS, "Choose a theme."),
    themeAccent: z.preprocess(blankToNull, hexColorSchema.nullable()),
    themeFont: z.enum(THEME_FONT_IDS, "Choose a font."),
  })
  .transform((value, ctx) => {
    const startsAt = zonedTimeToUtc(value.startsAt, value.timezone);
    const endsAt = zonedTimeToUtc(value.endsAt, value.timezone);
    const theme: EventTheme = {
      preset: value.themePreset,
      font: value.themeFont,
      ...(value.themeAccent ? { accent: value.themeAccent } : {}),
    };

    const problems: [path: string, message: string][] = [];
    if (!startsAt) problems.push(["startsAt", "Enter the start date and time."]);
    if (!endsAt) problems.push(["endsAt", "Enter the end date and time."]);
    if (startsAt && endsAt && endsAt <= startsAt) problems.push(["endsAt", "The event must end after it starts."]);
    const accent = accentProblem(theme);
    if (accent) problems.push(["themeAccent", accent]);

    if (problems.length > 0 || !startsAt || !endsAt) {
      for (const [path, message] of problems) ctx.addIssue({ code: "custom", path: [path], message });
      return z.NEVER;
    }

    return {
      name: value.name,
      type: value.type,
      slug: value.slug,
      timezone: value.timezone,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      venueName: value.venueName,
      venueAddress: value.venueAddress,
      theme,
    };
  });

export type EventInput = z.output<typeof eventFormSchema>;
