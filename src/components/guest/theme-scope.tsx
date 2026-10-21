import type { CSSProperties, ReactNode } from "react";
import { HEADING_FONT } from "@/components/events/theme-preview";
import { THEME_PRESETS, resolveAccent, type EventTheme } from "@/lib/events/theme";

/**
 * The Event Theme as CSS variables. The platform tokens (ink, panel, fg, gold ...)
 * are variables, so setting them on a wrapper re-dresses everything inside it: the
 * same Card, Button and Badge, in the colors the host chose. The accent takes the
 * place of gold, the platform's action color. Neon cyan stays the platform's, for
 * live moments.
 */
export function themeStyle(theme: EventTheme): CSSProperties {
  const preset = THEME_PRESETS[theme.preset];
  const accent = resolveAccent(theme);
  const mix = (a: string, share: number, b: string) => `color-mix(in srgb, ${a} ${share}%, ${b})`;

  return {
    "--color-ink": preset.background,
    "--color-surface": mix(preset.background, 50, preset.surface),
    "--color-panel": preset.surface,
    "--color-panel-raised": mix(preset.surface, 92, preset.text),
    "--color-line": mix(preset.background, 86, preset.text),
    "--color-line-strong": mix(preset.background, 76, preset.text),
    "--color-fg": preset.text,
    "--color-muted": preset.muted,
    "--color-subtle": mix(preset.muted, 70, preset.background),
    "--color-gold": accent,
    "--color-gold-hover": mix(accent, 82, "white"),
    "--shadow-gold": `0 0 20px ${mix(accent, 16, "transparent")}`,
  } as CSSProperties;
}

/** Inline style for a heading, so the theme's heading font applies. */
export const headingStyle = (theme: EventTheme): CSSProperties => ({ fontFamily: HEADING_FONT[theme.font] });

/** Fills the screen with the event's colors. Wrap a guest page in it. */
export function ThemeScope({ theme, children, className = "" }: { theme: EventTheme; children: ReactNode; className?: string }) {
  return (
    <div style={themeStyle(theme)} data-event-theme={theme.preset} className={`min-h-dvh bg-ink text-fg ${className}`}>
      {children}
    </div>
  );
}
