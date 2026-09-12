"use client";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { addTodo, deleteTodo, moveTodoToToday, renameTodo, toggleTodo } from "@/app/(app)/calendar/actions";
import type { DayItem } from "./day-panel";

function Row({ item, today, showOverdue }: { item: DayItem; today: string; showOverdue?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [pending, start] = useTransition();
  const overdue = showOverdue && !item.done && item.date < today;

  const commit = () => {
    setEditing(false);
    if (title.trim() && title.trim() !== item.title) start(() => renameTodo(item.id, title));
    else setTitle(item.title);
  };

  return (
    <li className={cn("flex items-center gap-3 py-2.5 border-b border-line last:border-0", pending && "opacity-50")}>
      <button
        type="button"
        aria-label={item.done ? "Mark not done" : "Mark done"}
        onClick={() => start(() => toggleTodo(item.id))}
        className={cn("size-6 shrink-0 rounded-full border-2 grid place-items-center transition", item.done ? "bg-green border-green text-black" : "border-line-strong hover:border-fg")}
      >
        {item.done && <span className="text-xs leading-none">✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(item.title); setEditing(false); } }}
          className="flex-1 bg-transparent border-b border-amber outline-none py-0.5"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={cn("flex-1 text-left truncate", item.done && "line-through text-fg-faint")} title="Click to edit">
          {item.title}
        </button>
      )}
      {item.kind === "reminder" && <span className="text-xs text-fg-faint">reminder</span>}
      {overdue && (
        <button type="button" onClick={() => start(() => moveTodoToToday(item.id))} className="text-xs text-amber hover:underline shrink-0">
          Move to today
        </button>
      )}
      <button type="button" aria-label="Delete" onClick={() => start(() => deleteTodo(item.id))} className="text-fg-faint hover:text-red text-sm shrink-0">
        ×
      </button>
    </li>
  );
}

export function TodoList({ date, today, items, allowAdd, showOverdue }: { date: string; today: string; items: DayItem[]; allowAdd?: boolean; showOverdue?: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setError(null);
    start(async () => {
      const r = await addTodo(date, t);
      if (!r.ok) setError(r.error);
      else setText("");
    });
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && <ul>{items.map((it) => <Row key={it.id} item={it} today={today} showOverdue={showOverdue} />)}</ul>}
      {allowAdd && (
        <div className="flex items-center gap-3 pt-1">
          <span className="size-6 shrink-0 rounded-full border-2 border-dashed border-line-strong" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Add a to-do"
            disabled={pending}
            className="flex-1 bg-transparent outline-none placeholder:text-fg-faint py-1 border-b border-transparent focus:border-line-strong"
          />
          {text.trim() && (
            <button type="button" onClick={submit} disabled={pending} className="text-sm text-green hover:underline">Add</button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red">{error}</p>}
    </div>
  );
}
