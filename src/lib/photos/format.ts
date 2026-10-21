/** "412 KB", "3.4 MB": what a person reads for storage used. Decimal units, as storage is billed. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1_000) return "1 KB";
  const units = [
    { name: "KB", size: 1_000 },
    { name: "MB", size: 1_000_000 },
    { name: "GB", size: 1_000_000_000 },
  ];
  let unit = units[0]!;
  for (const candidate of units) if (bytes >= candidate.size) unit = candidate;
  const value = bytes / unit.size;
  const text = value >= 100 || unit.name === "KB" ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, "");
  return `${text} ${unit.name}`;
}

/** "21 Oct, 19:42" in the event's own time zone. */
export function formatPhotoTime(instant: string, timeZone: string): string {
  const date = new Date(instant);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")} ${value("month")}, ${value("hour")}:${value("minute")}`;
}

/** The address of an event's big-screen wall. */
export function wallAddress(siteUrl: string, slug: string, wallKey: string): string {
  return `${siteUrl.replace(/\/$/, "")}/wall/${slug}/${wallKey}`;
}
