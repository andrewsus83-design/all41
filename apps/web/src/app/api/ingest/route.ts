import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { ingestToGraph } from "@/lib/engine/grounding";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const BUCKET = "user-files";
const TEXT_EXT = /\.(txt|md|markdown|csv|json|log|html?|xml|ya?ml|tsv)$/i;
const MAX_RAW_BYTES = 25 * 1024 * 1024;

type IngestResult = { chunks?: number; nodes?: number; edges?: number; node_count?: number; edge_count?: number } | null;

function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
}
function cleanFolder(v: unknown, fallback: string) {
  const f = typeof v === "string" ? v.trim().replace(/[\/\\]+/g, " ").slice(0, 60) : "";
  return f.length ? f : fallback;
}
function counts(res: IngestResult) {
  return { chunks: res?.chunks ?? res?.nodes ?? res?.node_count ?? 0, edges: res?.edges ?? res?.edge_count ?? 0 };
}
function engineLabel(res: IngestResult) {
  return env.graphEngineUrl ? (res ? "graph" : "unreachable") : "offline";
}

/**
 * Task 2.4 UI half — paste a note or upload a .txt/.md → files row (uploads) → graph ingest.
 *
 * Two request shapes, same JSON response `{ ok, fileId, sourceId, stored, chunks, edges, engine }`:
 *  - JSON `{ kind: "note"|"file", title?, content, filename?, folder? }` — the original contract (My Apps uses it).
 *  - multipart/form-data with `raw` (a File), optional `title`, `folder` — any file type; text-like files are also connected.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const raw = form?.get("raw");
    if (!form || !(raw instanceof File)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
    if (raw.size > MAX_RAW_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
    const title = String(form.get("title") ?? "").trim().slice(0, 200);
    const folder = cleanFolder(form.get("folder"), "uploads");
    const name = safeName(raw.name || "file");
    const isText = raw.type.startsWith("text/") || raw.type === "application/json" || TEXT_EXT.test(name);
    const type = raw.type || (isText ? (name.endsWith(".md") ? "text/markdown" : "text/plain") : "application/octet-stream");
    const storagePath = `${user.id}/${randomUUID()}-${name}`;
    const up = await supabase.storage.from(BUCKET).upload(storagePath, raw, { contentType: type, upsert: false });
    if (up.error) return NextResponse.json({ error: `UPLOAD_FAILED: ${up.error.message}` }, { status: 500 });
    const { data: row, error } = await supabase
      .from("files")
      .insert({ user_id: user.id, name, storage_path: storagePath, type, size_bytes: raw.size, folder })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: `FILE_ROW_FAILED: ${error.message}` }, { status: 500 });

    let res: IngestResult = null;
    if (isText && raw.size <= 500_000) {
      const content = (await raw.text()).trim();
      if (content.length >= 3) {
        res = (await ingestToGraph({ user_id: user.id, source_type: "file", source_id: row.id, title: title || name, content })) as IngestResult;
        if (res) await supabase.from("files").update({ graphify_indexed: true, graphify_node_count: counts(res).chunks }).eq("id", row.id);
      }
    }
    return NextResponse.json({ ok: true, fileId: row.id, sourceId: row.id, stored: true, ...counts(res), engine: engineLabel(res) });
  }

  const body = (await req.json().catch(() => null)) as { title?: string; content?: string; kind?: "note" | "file"; filename?: string; folder?: string } | null;
  const title = (body?.title ?? "").trim().slice(0, 200);
  const content = (body?.content ?? "").trim();
  if (!content || content.length < 3) return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
  if (content.length > 500_000) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  // Persist the raw text to Storage + a files row for BOTH uploads and pasted notes, so nothing is lost
  // if the graph engine is offline; only uploads are reported to the engine as source_type "file".
  const isUpload = body?.kind === "file";
  const sourceType: "file" | "manual" = isUpload ? "file" : "manual";
  const baseName = isUpload ? (body?.filename ?? "upload.txt") : `${title || "note"}.md`;
  const name = safeName(baseName);
  const storagePath = `${user.id}/${randomUUID()}-${name}`;
  const up = await supabase.storage.from(BUCKET).upload(storagePath, new Blob([content], { type: "text/plain" }), { contentType: "text/plain", upsert: false });
  if (up.error) return NextResponse.json({ error: `UPLOAD_FAILED: ${up.error.message}` }, { status: 500 });
  const { data: row, error } = await supabase
    .from("files")
    .insert({ user_id: user.id, name, storage_path: storagePath, type: name.endsWith(".md") ? "text/markdown" : "text/plain", size_bytes: content.length, folder: cleanFolder(body?.folder, isUpload ? "uploads" : "notes") })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: `FILE_ROW_FAILED: ${error.message}` }, { status: 500 });
  const fileId: string = row.id;
  const sourceId: string = isUpload ? row.id : randomUUID();

  const res = (await ingestToGraph({ user_id: user.id, source_type: sourceType, source_id: sourceId, title: title || (body?.filename ?? "Untitled note"), content })) as IngestResult;
  const c = counts(res);
  if (fileId && res) {
    await supabase.from("files").update({ graphify_indexed: true, graphify_node_count: c.chunks }).eq("id", fileId);
  }
  return NextResponse.json({ ok: true, fileId, sourceId, stored: true, ...c, engine: engineLabel(res) });
}
