/** Pure date helpers — local time, keys are YYYY-MM-DD. Shared by server and client. */

export function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidKey(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = parseKey(key);
  return !Number.isNaN(d.getTime()) && dateKey(d) === key;
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(key: string, n: number) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** [start, end) of the calendar month containing `key`, as Dates. */
export function monthRange(key: string) {
  const d = parseKey(key);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

/** Monday-start week [start, end) containing `key`. */
export function weekRange(key: string) {
  const d = parseKey(key);
  const day = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { start, end };
}

export function monthLabel(key: string) {
  return parseKey(key).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function longDate(key: string) {
  return parseKey(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Local date key for an ISO timestamp. */
export function keyOf(iso: string) {
  return dateKey(new Date(iso));
}

/** 6×7 grid of keys for the month containing `key` (Monday first), plus which belong to the month. */
export function monthGrid(key: string) {
  const { start } = monthRange(key);
  const lead = (start.getDay() + 6) % 7;
  const first = new Date(start.getFullYear(), start.getMonth(), 1 - lead);
  const cells: { key: string; inMonth: boolean; day: number }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    cells.push({ key: dateKey(d), inMonth: d.getMonth() === start.getMonth(), day: d.getDate() });
  }
  return cells;
}
