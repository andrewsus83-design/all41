"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type TodoKind = "once" | "routine";
export type Cadence = "daily" | "weekly" | "monthly";
export type Todo = { id: string; title: string; kind: TodoKind; cadence: Cadence | null; done: boolean };
export type Note = { id: string; body: string; created_at: string };

type Err = { ok: false; error: string };
type Void = { ok: true } | Err;

/** Rename the user's space (the journal title). Empty clears it back to the default. */
export async function renameSpace(name: string): Promise<Void> {
  const { user } = await requireUser();
  const clean = name.trim().slice(0, 40);
  const { error } = await adminClient().from("profiles").update({ space_name: clean || null }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  return { ok: true };
}

export async function addTodo(title: string, kind: TodoKind, cadence: Cadence | null): Promise<{ ok: true; todo: Todo } | Err> {
  const { user } = await requireUser();
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, error: "Write something first." };
  const { data, error } = await adminClient()
    .from("journal_todos")
    .insert({ user_id: user.id, title: t, kind, cadence: kind === "routine" ? cadence : null })
    .select("id, title, kind, cadence, done")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not add." };
  revalidatePath("/home");
  return { ok: true, todo: { id: data.id, title: data.title, kind: data.kind as TodoKind, cadence: (data.cadence as Cadence | null) ?? null, done: data.done } };
}

export async function setTodoDone(id: string, done: boolean): Promise<Void> {
  const { user } = await requireUser();
  const { error } = await adminClient().from("journal_todos").update({ done, completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  return { ok: true };
}

export async function deleteTodo(id: string): Promise<Void> {
  const { user } = await requireUser();
  const { error } = await adminClient().from("journal_todos").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  return { ok: true };
}

/** Write a note straight into the journal — it lands at the top of the feed. */
export async function addNote(body: string): Promise<{ ok: true; note: Note } | Err> {
  const { user } = await requireUser();
  const b = body.trim().slice(0, 4000);
  if (!b) return { ok: false, error: "Write something first." };
  const { data, error } = await adminClient().from("journal_notes").insert({ user_id: user.id, body: b }).select("id, body, created_at").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save." };
  revalidatePath("/home");
  return { ok: true, note: { id: data.id, body: data.body, created_at: data.created_at } };
}
