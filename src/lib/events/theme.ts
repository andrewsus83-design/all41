import { z } from "zod";

/**
 * The Event Theme: how the guest pages of one event look. It belongs to the
 * client, so it is separate from the all41 brand. Stored in a41_events.theme.
 */
export const THEME_PRESETS = {
  midnight: {
    name: "Midnight",
    blurb: "Dark with neon accents",
    background: "#07070d",
    surface: "#0f0f19",
    text: "#f3f3f8",
    muted: "#a3a3ba",
    accent: "#27e6ff",
  },
  gala: {
    name: "Gala",
    blurb: "Dark with gold, for a formal night",
    background: "#0c0a08",
    surface: "#16130f",
    text: "#f6f1e7",
    muted: "#b5ab97",
    accent: "#d4af5f",
  },
} as const;

export type ThemePreset = keyof typeof THEME_PRESETS;
export const THEME_PRESET_IDS = Object.keys(THEME_PRESETS) as [ThemePreset, ...ThemePreset[]];

export const THEME_FONTS = {
  modern: { name: "Modern", blurb: "Clean sans-serif headings" },
  classic: { name: "Classic", blurb: "Serif headings" },
} as const;

export type ThemeFont = keyof typeof THEME_FONTS;
export const THEME_FONT_IDS = Object.keys(THEME_FONTS) as [ThemeFont, ...ThemeFont[]];

export const hexColorSchema = z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/, "Pick a color.");

export const eventThemeSchema = z.object({
  preset: z.enum(THEME_PRESET_IDS).default("midnight"),
  accent: hexColorSchema.optional(),
  font: z.enum(THEME_FONT_IDS).default("modern"),
});

export type EventTheme = z.output<typeof eventThemeSchema>;

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two #rrggbb colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever reads better on a button of the given color. */
export function readableTextOn(hex: string): "#000000" | "#ffffff" {
  return contrastRatio(hex, "#000000") >= contrastRatio(hex, "#ffffff") ? "#000000" : "#ffffff";
}

/** Links and buttons need at least this much contrast against the background. */
export const MIN_ACCENT_CONTRAST = 3;

export function resolveAccent(theme: Pick<EventTheme, "preset" | "accent">): string {
  return theme.accent ?? THEME_PRESETS[theme.preset].accent;
}

/** Null when the accent reads well on the preset's background, otherwise what to tell the host. */
export function accentProblem(theme: Pick<EventTheme, "preset" | "accent">): string | null {
  const preset = THEME_PRESETS[theme.preset];
  if (contrastRatio(resolveAccent(theme), preset.background) >= MIN_ACCENT_CONTRAST) return null;
  return `That accent is too dark to read on the ${preset.name} background. Pick a lighter one.`;
}

/** Reads a stored theme and falls back to the defaults when it is missing or from an older shape. */
export function parseTheme(stored: unknown): EventTheme {
  const parsed = eventThemeSchema.safeParse(stored);
  return parsed.success ? parsed.data : eventThemeSchema.parse({});
}
