import { ImageResponse } from "next/og";
import { THEME_PRESETS, resolveAccent } from "@/lib/events/theme";
import { getCachedPublicEvent } from "@/lib/guest/cached";
import { eventWhen } from "@/lib/guest/format";
import { SITE_NAME } from "@/lib/site";

// The picture a chat app or social network shows when the event page is shared: the event's own colors,
// its name, and when and where. It is read from the same cached public event as the page, so a draft or
// unknown address gets no picture (a plain 404) and nothing here can leak.
export const alt = "Event invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);
  if (!event) return new Response(null, { status: 404 });

  const preset = THEME_PRESETS[event.theme.preset];
  const accent = resolveAccent(event.theme);
  const name = shorten(event.name.replace(/\s+/g, " "), 90);
  const when = eventWhen(event.startsAt, event.endsAt, event.timezone);
  // The venue's name is enough for a preview; the full address is on the page.
  const where = shorten((event.venueName ?? event.venueAddress ?? "").replace(/\s+/g, " "), 70);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: preset.background,
          backgroundImage: `radial-gradient(circle at 85% 0%, ${accent}33, ${preset.background} 55%)`,
          color: preset.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 6, borderRadius: 3, background: accent }} />
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: accent, fontWeight: 700 }}>
            {event.type === "wedding" ? "Wedding" : "Corporate event"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: name.length > 48 ? 64 : 84, lineHeight: 1.1, fontWeight: 700 }}>{name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 32, color: preset.muted }}>
            <div style={{ display: "flex" }}>{when.summary}</div>
            {where ? <div style={{ display: "flex" }}>{where}</div> : null}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: preset.muted }}>{SITE_NAME}</div>
      </div>
    ),
    { ...size },
  );
}
