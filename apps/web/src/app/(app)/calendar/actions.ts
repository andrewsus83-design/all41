"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { isValidKey, todayKey } from "@/components/calendar/dates";

async function ownItem(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("calendar_items").select("id, done, date").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, item: data };
}

export async function addTodo(date: string, title: string) {
  const { supabase, user } = await requireUser();
  const t = title.trim().slice(0, 200);
  if (!t) return { ok: false as const, error: "Write a few words first." };
  if (!isValidKey(date)) return { ok: false as const, error: "That date does not look right." };
  const { error } = await supabase.from("calendar_items").insert({ user_id: user.id, date, title: t, kind: "todo", done: false });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function toggleTodo(id: string) {
  const { supabase, item } = await ownItem(id);
  await supabase.from("calendar_items").update({ done: !item.done }).eq("id", id);
  revalidatePath("/calendar");
}

export async function deleteTodo(id: string) {
  const { supabase } = await ownItem(id);
  await supabase.from("calendar_items").delete().eq("id", id);
  revalidatePath("/calendar");
}

export async function renameTodo(id: string, title: string) {
  const t = title.trim().slice(0, 200);
  if (!t) return;
  const { supabase } = await ownItem(id);
  await supabase.from("calendar_items").update({ title: t }).eq("id", id);
  revalidatePath("/calendar");
}

export async function moveTodoToToday(id: string) {
  const { supabase } = await ownItem(id);
  await supabase.from("calendar_items").update({ date: todayKey() }).eq("id", id);
  revalidatePath("/calendar");
}
