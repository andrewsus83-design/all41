/** "19:42" in the event's own time zone. */
export function formatClock(instant: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant));
}

/** "just now", "3 min ago", "2 h ago": how long ago something happened, for a list that updates by itself. */
export function formatAgo(instant: Date | string | number, now: Date | number = Date.now()): string {
  const seconds = Math.max(0, Math.round((new Date(now).getTime() - new Date(instant).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
