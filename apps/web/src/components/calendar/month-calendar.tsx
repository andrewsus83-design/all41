"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { monthGrid, monthLabel, parseKey, dateKey, todayKey } from "./dates";

export type DayMarks = { green: boolean; amber: boolean; red: boolean };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(key: string, n: number) {
  const d = parseKey(key);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const t = new Date();
  // Landing on the current month selects today; otherwise the 1st.
  if (target.getFullYear() === t.getFullYear() && target.getMonth() === t.getMonth()) return todayKey();
  return dateKey(target);
}

export function MonthCalendar({ selected, today, marks }: { selected: string; today: string; marks: Record<string, DayMarks> }) {
  const router = useRouter();
  const cells = monthGrid(selected);
  const isCurrentMonth = selected.slice(0, 7) === today.slice(0, 7);

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-medium">{monthLabel(selected)}</h2>
        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <Link href={`/calendar?d=${today}`} className="squircle h-9 px-3 inline-flex items-center rounded-1 text-sm text-fg-muted hover:text-fg hover:bg-bg-elev-2">
              Today
            </Link>
          )}
          <Link href={`/calendar?d=${shiftMonth(selected, -1)}`} aria-label="Previous month" className="squircle size-9 inline-flex items-center justify-center rounded-1 border border-line-strong hover:bg-bg-elev-2">
            ‹
          </Link>
          <Link href={`/calendar?d=${shiftMonth(selected, 1)}`} aria-label="Next month" className="squircle size-9 inline-flex items-center justify-center rounded-1 border border-line-strong hover:bg-bg-elev-2">
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-fg-faint">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const m = marks[c.key];
          const isSel = c.key === selected;
          const isToday = c.key === today;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => router.push(`/calendar?d=${c.key}`)}
              aria-pressed={isSel}
              aria-label={c.key}
              className={cn(
                "squircle rounded-2 h-16 flex flex-col items-center justify-center gap-1.5 transition border",
                isSel ? "bg-fg text-bg border-fg" : "border-transparent hover:bg-bg-elev-2",
                !c.inMonth && !isSel && "text-fg-faint/60",
                isToday && !isSel && "border-amber text-amber",
              )}
            >
              <span className={cn("num text-base", isToday && !isSel && "font-semibold")}>{c.day}</span>
              <span className="flex gap-1 h-1.5">
                {m?.green && <span className={cn("size-1.5 rounded-full", isSel ? "bg-bg" : "bg-green")} />}
                {m?.amber && <span className={cn("size-1.5 rounded-full", isSel ? "bg-bg" : "bg-amber")} />}
                {m?.red && <span className={cn("size-1.5 rounded-full", isSel ? "bg-bg" : "bg-red")} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-5 text-xs text-fg-faint">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green" /> done</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber" /> planned</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-red" /> overdue</span>
      </div>
    </Card>
  );
}
