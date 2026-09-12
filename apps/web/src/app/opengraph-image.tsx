import { ImageResponse } from "next/og";

export const alt = "all41 — Tell us the job. We'll handle the AI.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "#0b0c0f",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#ff4d4f" }} />
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#ffb020" }} />
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#2fd27d" }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>all41</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>Tell us the job.</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, color: "#2fd27d" }}>We&apos;ll handle the AI.</div>
        </div>
        <div style={{ fontSize: 30, color: "#a1a1aa" }}>No prompts to learn. No tools to juggle. Start with $2 free.</div>
      </div>
    ),
    { ...size },
  );
}
