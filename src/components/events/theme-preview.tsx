import { THEME_PRESETS, readableTextOn, resolveAccent, type EventTheme } from "@/lib/events/theme";

/** The font stack a theme's headings use. Guest pages read the same table. */
export const HEADING_FONT: Record<EventTheme["font"], string> = {
  modern: "var(--font-outfit), var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
  classic: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
};

/** A small mock of an event's landing page in its Event Theme, so a host sees the look while choosing it. */
export function ThemePreview({
  theme,
  name,
  when,
  where,
}: {
  theme: EventTheme;
  name: string;
  when: string;
  where: string;
}) {
  const preset = THEME_PRESETS[theme.preset];
  const accent = resolveAccent(theme);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-line"
      style={{ background: preset.background, color: preset.text }}
      role="img"
      aria-label={`Preview of the ${preset.name} theme`}
    >
      <div className="relative px-6 pt-8 pb-7">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-24 opacity-40"
          style={{ background: `radial-gradient(60% 100% at 50% 0%, ${accent}, transparent)` }}
        />
        <p className="relative text-xs font-medium tracking-[0.2em] uppercase" style={{ color: accent }}>
          You are invited
        </p>
        <h3
          className="relative mt-3 text-2xl leading-tight font-semibold break-words"
          style={{ fontFamily: HEADING_FONT[theme.font] }}
        >
          {name || "Your event name"}
        </h3>
        <p className="relative mt-2 text-sm" style={{ color: preset.muted }}>
          {when}
        </p>
        <p className="relative text-sm" style={{ color: preset.muted }}>
          {where}
        </p>
      </div>
      <div className="px-6 pb-6">
        <div className="rounded-2xl p-4" style={{ background: preset.surface }}>
          <p className="text-sm font-medium">Will you join us?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="inline-flex h-10 items-center rounded-2xl px-4 text-sm font-bold whitespace-nowrap"
              style={{ background: accent, color: readableTextOn(accent) }}
            >
              Yes, I will be there
            </span>
            <span
              className="inline-flex h-10 items-center rounded-2xl border px-4 text-sm whitespace-nowrap"
              style={{ borderColor: preset.muted, color: preset.muted }}
            >
              Can&apos;t make it
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
