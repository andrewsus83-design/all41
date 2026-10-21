import type { CSSProperties } from "react";
import { THEME_PRESETS, readableTextOn, resolveAccent, type EventTheme } from "@/lib/events/theme";

/**
 * The look of one event on its guest-facing pages: the theme's colors as CSS
 * variables, to be set on a wrapper. Pages read them with var(--ev-...), so the
 * event can be dark gold or neon cyan without a class per color.
 */
export function eventLookStyle(theme: EventTheme): CSSProperties {
  const preset = THEME_PRESETS[theme.preset];
  const accent = resolveAccent(theme);
  return {
    "--ev-bg": preset.background,
    "--ev-surface": preset.surface,
    "--ev-text": preset.text,
    "--ev-muted": preset.muted,
    "--ev-accent": accent,
    "--ev-on-accent": readableTextOn(accent),
    "--ev-heading": theme.font === "classic" ? "ui-serif, Georgia, 'Times New Roman', serif" : "var(--font-outfit), var(--font-manrope), system-ui, sans-serif",
    background: "var(--ev-bg)",
    color: "var(--ev-text)",
  } as CSSProperties;
}

/** The theme as plain values, for drawing on a canvas. */
export function eventPalette(theme: EventTheme) {
  const preset = THEME_PRESETS[theme.preset];
  return {
    background: preset.background,
    surface: preset.surface,
    text: preset.text,
    muted: preset.muted,
    accent: resolveAccent(theme),
    serif: theme.font === "classic",
  };
}

export type EventPalette = ReturnType<typeof eventPalette>;
