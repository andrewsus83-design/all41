"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  const role = String(formData.get("role") ?? "").trim().slice(0, 80) || null;
  const { error } = await supabase.from("profiles").update({ display_name: display_name || null, role }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
