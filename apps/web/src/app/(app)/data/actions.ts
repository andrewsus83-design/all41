"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ingestToGraph } from "@/lib/engine/grounding";
import type { Json } from "@/lib/supabase/database.types";

export type SheetColumn = { key: string; label: string; type: "text" | "number" | "date" };

const BUCKET = "user-files";

function cleanFolder(folder: string | null | undefined) {
  const f = (folder ?? "").trim().replace(/[\/\\]+/g, " ").slice(0, 60);
  return f.length ? f : null;
}
function cleanName(name: string, max = 120) {
  return name.trim().replace(/\s+/g, " ").slice(0, max);
}
function cleanColumns(cols: unknown): SheetColumn[] {
  if (!Array.isArray(cols)) return [];
  const seen = new Set<string>();
  const out: SheetColumn[] = [];
  for (const c of cols) {
    if (!c || typeof c !== "object") continue;
    const o = c as Partial<SheetColumn>;
    const key = String(o.key ?? "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const type: SheetColumn["type"] = o.type === "number" || o.type === "date" ? o.type : "text";
    out.push({ key, label: cleanName(String(o.label ?? key), 60) || key, type });
  }
  return out.slice(0, 60);
}
function cleanRow(data: unknown, cols: SheetColumn[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data || typeof data !== "object") return out;
  const d = data as Record<string, unknown>;
  for (const c of cols) {
    const v = d[c.key];
    if (v === undefined || v === null) continue;
    out[c.key] = String(v).slice(0, 4000);
  }
  return out;
}
function done() {
  revalidatePath("/data");
}

/* ----------------------------- Files ----------------------------- */

async function ownFile(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("files").select("id, name, storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, file: data };
}

export async function moveFile(id: string, folder: string | null) {
  const { supabase } = await ownFile(id);
  await supabase.from("files").update({ folder: cleanFolder(folder) }).eq("id", id);
  done();
}

export async function renameFile(id: string, name: string) {
  const n = cleanName(name);
  if (!n) return;
  const { supabase } = await ownFile(id);
  await supabase.from("files").update({ name: n }).eq("id", id);
  done();
}

export async function deleteFile(id: string) {
  const { supabase, user, file } = await ownFile(id);
  await supabase.storage.from(BUCKET).remove([file.storage_path]);
  await supabase.from("files").delete().eq("id", id);
  // Its connections go too (edges cascade in the database).
  await adminClient().from("knowledge_nodes").delete().eq("user_id", user.id).eq("source_type", "file").eq("source_id", id);
  done();
}

/* ----------------------------- Sheets ---------------------------- */

async function ownSheet(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("user_tables").select("id, columns").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, sheet: data };
}

export async function createSheet(name: string, columns: SheetColumn[], folder: string | null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const n = cleanName(name, 80);
  if (!n) return { ok: false, error: "Give the sheet a name." };
  const cols = cleanColumns(columns);
  const { data, error } = await supabase
    .from("user_tables")
    .insert({ user_id: user.id, name: n, columns: (cols.length ? cols : [{ key: "name", label: "Name", type: "text" }]) as unknown as Json, folder: cleanFolder(folder) })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create the sheet." };
  done();
  return { ok: true, id: data.id };
}

export async function renameSheet(id: string, name: string) {
  const n = cleanName(name, 80);
  if (!n) return;
  const { supabase } = await ownSheet(id);
  await supabase.from("user_tables").update({ name: n }).eq("id", id);
  done();
}

export async function moveSheet(id: string, folder: string | null) {
  const { supabase } = await ownSheet(id);
  await supabase.from("user_tables").update({ folder: cleanFolder(folder) }).eq("id", id);
  done();
}

export async function deleteSheet(id: string) {
  const { supabase } = await ownSheet(id);
  await supabase.from("user_rows").delete().eq("table_id", id);
  await supabase.from("user_tables").delete().eq("id", id);
  done();
}

export async function setSheetColumns(id: string, columns: SheetColumn[]) {
  const { supabase } = await ownSheet(id);
  const cols = cleanColumns(columns);
  if (!cols.length) return { ok: false as const, error: "A sheet needs at least one column." };
  await supabase.from("user_tables").update({ columns: cols as unknown as Json }).eq("id", id);
  done();
  return { ok: true as const, columns: cols };
}

export async function addRow(tableId: string, data: Record<string, string>): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user, sheet } = await ownSheet(tableId);
  const row = cleanRow(data, cleanColumns(sheet.columns));
  const { data: ins, error } = await supabase.from("user_rows").insert({ user_id: user.id, table_id: tableId, data: row }).select("id").single();
  if (error || !ins) return { ok: false, error: error?.message ?? "Could not add the row." };
  // Row edits keep the grid's local state as the source of truth — no page-wide revalidation.
  return { ok: true, id: ins.id };
}

export async function updateRow(rowId: string, data: Record<string, string>) {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase.from("user_rows").select("id, table_id").eq("id", rowId).eq("user_id", user.id).maybeSingle();
  if (!row) throw new Error("NOT_FOUND");
  const { sheet } = await ownSheet(row.table_id);
  await supabase.from("user_rows").update({ data: cleanRow(data, cleanColumns(sheet.columns)) }).eq("id", rowId);
}

export async function deleteRow(rowId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("user_rows").delete().eq("id", rowId).eq("user_id", user.id);
}

/** CSV import: adds any missing columns, then appends rows. */
export async function importRows(tableId: string, columns: SheetColumn[], rows: Record<string, string>[]) {
  const { supabase, user, sheet } = await ownSheet(tableId);
  const existing = cleanColumns(sheet.columns);
  const incoming = cleanColumns(columns);
  const merged = [...existing];
  for (const c of incoming) if (!merged.some((m) => m.key === c.key)) merged.push(c);
  if (merged.length !== existing.length) await supabase.from("user_tables").update({ columns: merged as unknown as Json }).eq("id", tableId);
  const clean = rows.slice(0, 2000).map((r) => ({ user_id: user.id, table_id: tableId, data: cleanRow(r, merged) }));
  if (clean.length) {
    const { error } = await supabase.from("user_rows").insert(clean);
    if (error) return { ok: false as const, error: error.message };
  }
  done();
  return { ok: true as const, added: clean.length, columns: merged };
}

/* ------------------------------ Docs ----------------------------- */

async function ownDoc(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("user_docs").select("id, title, content_md").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, doc: data };
}

export async function createDoc(folder: string | null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("user_docs").insert({ user_id: user.id, title: "Untitled", content_md: "", folder: cleanFolder(folder) }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create the doc." };
  done();
  return { ok: true, id: data.id };
}

export async function saveDoc(id: string, title: string, content: string) {
  const { supabase } = await ownDoc(id);
  await supabase.from("user_docs").update({ title: cleanName(title, 160) || "Untitled", content_md: content.slice(0, 500_000) }).eq("id", id);
  done();
}

export async function moveDoc(id: string, folder: string | null) {
  const { supabase } = await ownDoc(id);
  await supabase.from("user_docs").update({ folder: cleanFolder(folder) }).eq("id", id);
  done();
}

export async function deleteDoc(id: string) {
  const { supabase, user } = await ownDoc(id);
  await supabase.from("user_docs").delete().eq("id", id);
  await adminClient().from("knowledge_nodes").delete().eq("user_id", user.id).eq("source_type", "manual").eq("source_id", id);
  done();
}

/** Connect a doc: its text becomes part of what the AI can draw on. */
export async function connectDoc(id: string): Promise<{ ok: true; chunks: number } | { ok: false; error: string }> {
  const { user, doc } = await ownDoc(id);
  const content = doc.content_md.trim();
  if (content.length < 3) return { ok: false, error: "Write something first, then connect it." };
  // Replace any earlier version so it is not counted twice.
  await adminClient().from("knowledge_nodes").delete().eq("user_id", user.id).eq("source_type", "manual").eq("source_id", id);
  const res = (await ingestToGraph({ user_id: user.id, source_type: "manual", source_id: id, title: doc.title, content })) as
    | { chunks?: number; nodes?: number; node_count?: number }
    | null;
  if (!res) return { ok: false, error: "Connections are being prepared. Try again in a moment." };
  done();
  return { ok: true, chunks: res.chunks ?? res.nodes ?? res.node_count ?? 0 };
}
