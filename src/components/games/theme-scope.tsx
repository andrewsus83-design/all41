import type { CSSProperties, ReactNode } from "react";
import { THEME_PRESETS, parseTheme, resolveAccent } from "@/lib/events/theme";

/**
 * Dresses guest pages in the event's theme: it re-points the color tokens the
 * primitives use, so buttons, cards and text pick up the event's colors below it.
 */
export function ThemeScope({ theme, className = "", children }: { theme: unknown; className?: string; children: ReactNode }) {
  const parsed = parseTheme(theme);
  const preset = THEME_PRESETS[parsed.preset];
  const accent = resolveAccent(parsed);
  const style = {
    "--color-ink": preset.background,
    "--color-surface": preset.surface,
    "--color-panel": preset.surface,
    "--color-fg": preset.text,
    "--color-muted": preset.muted,
    "--color-gold": accent,
    "--color-gold-hover": accent,
    background: preset.background,
    color: preset.text,
  } as CSSProperties;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
