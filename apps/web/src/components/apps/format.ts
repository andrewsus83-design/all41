/** Plain-words labels. Nothing techy leaks to the screen. */

export function scheduleLabel(s: string) {
  switch (s) {
    case "daily": return "Every day";
    case "weekly": return "Every week";
    case "monthly": return "Every month";
    default: return "Runs once";
  }
}

export function targetLabel(t: string) {
  switch (t) {
    case "email": return "sent by email";
    case "dashboard": return "to your dashboard";
    default: return "here in the app";
  }
}

export function statusLabel(s: string) {
  switch (s) {
    case "active": return "Live";
    case "paused": return "Paused";
    case "done": return "Finished";
    case "draft": return "Draft";
    default: return s;
  }
}

export function statusTone(s: string): "green" | "amber" | "neutral" | "red" {
  return s === "active" ? "green" : s === "paused" ? "amber" : s === "failed" || s === "blocked" ? "red" : "neutral";
}

export function runStatusLabel(s: string) {
  switch (s) {
    case "done": return "Done";
    case "running": return "Running";
    case "queued": return "Waiting";
    case "blocked": return "Needs credit";
    case "failed": return "Didn't finish";
    default: return s;
  }
}

export function when(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function relative(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const unit = abs < 3600e3 ? [Math.round(abs / 60e3), "min"] : abs < 86400e3 ? [Math.round(abs / 3600e3), "hr"] : [Math.round(abs / 86400e3), "day"];
  const n = unit[0] as number;
  const label = `${n} ${unit[1]}${n === 1 ? "" : "s"}`;
  return diff < 0 ? `${label} ago` : `in ${label}`;
}

/** "Which AI did the work" — the one place a provider is named, in friendly words. */
export function whichAi(modelsUsed: string[] | undefined | null): string {
  const ids = (modelsUsed ?? []).filter(Boolean);
  if (!ids.length) return "No AI was needed for this run.";
  const providers = Array.from(new Set(ids.map((m) => m.split(":")[0])));
  const names = providers.map((p) => {
    switch (p) {
      case "anthropic": return "Claude (Anthropic)";
      case "openai": return "OpenAI";
      case "google": return "Gemini (Google)";
      case "groq": return "Groq";
      case "perplexity": return "Perplexity";
      case "deepseek": return "DeepSeek";
      case "xai": return "Grok (xAI)";
      case "mistral": return "Mistral";
      case "mock": return "practice mode — no AI key connected yet, so this is a stand-in";
      default: return p;
    }
  });
  return names.join(" and ");
}

export function answerToText(v: unknown) {
  return Array.isArray(v) ? v.join(", ") : v === undefined || v === null ? "" : String(v);
}
