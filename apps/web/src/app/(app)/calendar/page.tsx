import { createClient } from "@/lib/supabase/server";
import { MonthCalendar, type DayMarks } from "@/components/calendar/month-calendar";
import { WeekStrip } from "@/components/calendar/week-strip";
import { DayPanel, type DayItem, type DayRun, type DayTask } from "@/components/calendar/day-panel";
import { isValidKey, keyOf, monthRange, todayKey, weekRange } from "@/components/calendar/dates";

export const metadata = { title: "Calendar" };

function taskTitle(briefing: unknown, instanceName: string | null | undefined) {
  const what = briefing && typeof briefing === "object" ? (briefing as { what?: unknown }).what : undefined;
  if (typeof what === "string" && what.trim()) return what.trim();
  return instanceName?.trim() || "Task";
}

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const sp = await props.searchParams;
  const today = todayKey();
  const raw = typeof sp.d === "string" ? sp.d : "";
  const selected = isValidKey(raw) ? raw : today;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const month = monthRange(selected);
  const week = weekRange(today);
  const mS = month.start.toISOString(), mE = month.end.toISOString();
  const wS = week.start.toISOString(), wE = week.end.toISOString();

  // One pass for the visible month (+ this week's summary + anything overdue).
  const [{ data: tasks }, { data: items }, { data: instances }, { data: overdue }, { data: weekTasks }, { data: weekUsage }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, briefing, status, total_billed, app_instance_id, created_at, completed_at")
      .or(`and(completed_at.gte.${mS},completed_at.lt.${mE}),and(created_at.gte.${mS},created_at.lt.${mE})`)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("calendar_items").select("id, date, title, note, kind, done, task_id, app_instance_id").gte("date", mS.slice(0, 10)).lt("date", mE.slice(0, 10)).order("created_at"),
    supabase.from("user_app_instances").select("id, name, schedule, status, next_run_at"),
    supabase.from("calendar_items").select("id, date, title, note, kind, done, task_id, app_instance_id").eq("done", false).lt("date", today).order("date").limit(100),
    supabase.from("tasks").select("id").gte("completed_at", wS).lt("completed_at", wE).limit(1000),
    supabase.from("api_usage_log").select("billed_usd").gte("created_at", wS).lt("created_at", wE),
  ]);

  const instanceName = new Map((instances ?? []).map((i) => [i.id, i.name]));
  const marks: Record<string, DayMarks> = {};
  const mark = (key: string, k: keyof DayMarks) => {
    const m = (marks[key] ??= { green: false, amber: false, red: false });
    m[k] = true;
  };

  const tasksByDay = new Map<string, DayTask[]>();
  for (const t of tasks ?? []) {
    const key = keyOf(t.completed_at ?? t.created_at);
    const dt: DayTask = {
      id: t.id,
      title: taskTitle(t.briefing, t.app_instance_id ? instanceName.get(t.app_instance_id) : null),
      status: t.status,
      billed: Number(t.total_billed),
      at: t.completed_at ?? t.created_at,
      instanceId: t.app_instance_id,
    };
    (tasksByDay.get(key) ?? tasksByDay.set(key, []).get(key)!).push(dt);
    if (t.status === "done") mark(key, "green");
  }

  const itemsByDay = new Map<string, DayItem[]>();
  for (const it of items ?? []) {
    (itemsByDay.get(it.date) ?? itemsByDay.set(it.date, []).get(it.date)!).push(it);
    if (it.done) mark(it.date, "green");
    else if (it.date < today) mark(it.date, "red");
    else mark(it.date, "amber");
  }
  for (const o of overdue ?? []) mark(o.date, "red");

  const runsByDay = new Map<string, DayRun[]>();
  for (const i of instances ?? []) {
    if (i.status !== "active" || !i.next_run_at) continue;
    const key = keyOf(i.next_run_at);
    if (key < mS.slice(0, 10) || key >= mE.slice(0, 10)) continue;
    (runsByDay.get(key) ?? runsByDay.set(key, []).get(key)!).push({ id: i.id, name: i.name ?? "App", schedule: i.schedule, at: i.next_run_at });
    mark(key, "amber");
  }

  const spentWeek = (weekUsage ?? []).reduce((n, r) => n + Number(r.billed_usd), 0);

  return (
    <div className="max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Calendar</h1>
        <p className="text-fg-muted">What happened, and what is planned. One day at a time.</p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6">
          <WeekStrip tasksRun={(weekTasks ?? []).length} spent={spentWeek} />
          <MonthCalendar selected={selected} today={today} marks={marks} />
        </div>
        <DayPanel
          date={selected}
          today={today}
          tasks={tasksByDay.get(selected) ?? []}
          items={itemsByDay.get(selected) ?? []}
          runs={runsByDay.get(selected) ?? []}
          overdue={selected === today ? (overdue ?? []) : []}
        />
      </div>
    </div>
  );
}
