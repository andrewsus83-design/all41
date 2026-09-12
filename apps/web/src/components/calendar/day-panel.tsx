import Link from "next/link";
import { Card, CardHint } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { longDate, shortTime } from "./dates";
import { TodoList } from "./todo-list";

export type DayTask = { id: string; title: string; status: string; billed: number; at: string; instanceId: string | null };
export type DayRun = { id: string; name: string; schedule: string; at: string };
export type DayItem = { id: string; date: string; title: string; note: string | null; kind: string; done: boolean; task_id: string | null; app_instance_id: string | null };

function statusTone(s: string): "green" | "amber" | "red" | "neutral" {
  if (s === "done") return "green";
  if (s === "failed" || s === "blocked") return "red";
  if (s === "running" || s === "queued" || s === "planned") return "amber";
  return "neutral";
}

function TaskRow({ t }: { t: DayTask }) {
  const href = t.instanceId ? `/my-apps/${t.instanceId}` : `/build?task=${t.id}`;
  return (
    <li className="flex items-center gap-4 py-3 border-b border-line last:border-0">
      <span className="num text-xs text-fg-faint w-12 shrink-0">{shortTime(t.at)}</span>
      <div className="min-w-0 flex-1">
        <Link href={href} className="hover:underline truncate block">{t.title}</Link>
        {t.instanceId && <span className="text-xs text-fg-faint">app run</span>}
      </div>
      <Money usd={t.billed} className="text-sm text-fg-muted" />
      <Badge tone={statusTone(t.status)}>{t.status}</Badge>
    </li>
  );
}

export function DayPanel({ date, today, tasks, items, runs, overdue }: { date: string; today: string; tasks: DayTask[]; items: DayItem[]; runs: DayRun[]; overdue: DayItem[] }) {
  const isPast = date < today;
  const isToday = date === today;

  if (isPast) {
    const empty = tasks.length === 0 && items.length === 0;
    return (
      <Card className="space-y-6">
        <div className="space-y-1">
          <CardHint>History</CardHint>
          <h2 className="text-2xl font-medium">{longDate(date)}</h2>
        </div>
        {empty && <p className="text-fg-faint">Nothing happened this day.</p>}
        {tasks.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-fg-faint">What ran</p>
            <ul>{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
          </section>
        )}
        {items.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-fg-faint">To-dos</p>
            <TodoList date={date} today={today} items={items} showOverdue />
          </section>
        )}
      </Card>
    );
  }

  const empty = runs.length === 0 && items.length === 0 && overdue.length === 0;
  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <CardHint>Plan</CardHint>
        <h2 className="text-2xl font-medium">{isToday ? "Today" : longDate(date)}</h2>
        {isToday && <p className="text-sm text-fg-faint">{longDate(date)}</p>}
      </div>

      {tasks.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Ran today</p>
          <ul>{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        </section>
      )}

      {runs.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Apps that will run</p>
          <ul>
            {runs.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3 border-b border-line last:border-0">
                <span className="num text-xs text-fg-faint w-12 shrink-0">{shortTime(r.at)}</span>
                <Link href={`/my-apps/${r.id}`} className="flex-1 truncate hover:underline">{r.name}</Link>
                <span className="text-xs text-fg-faint">{r.schedule}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-red">Still open from before</p>
          <TodoList date={date} today={today} items={overdue} showOverdue />
        </section>
      )}

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-fg-faint">To-dos</p>
        {empty && <p className="text-fg-faint">Nothing planned. Add a to-do or build an app that runs on a schedule.</p>}
        <TodoList date={date} today={today} items={items} allowAdd />
      </section>
    </Card>
  );
}
