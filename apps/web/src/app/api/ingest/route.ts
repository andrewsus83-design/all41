import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { ingestToGraph } from "@/lib/engine/grounding";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Task 2.4 UI half — paste a note or upload a .txt/.md → files row (uploads) → graph ingest. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { title?: string; content?: string; kind?: "note" | "file"; filename?: string } | null;
  const title = (body?.title ?? "").trim().slice(0, 200);
  const content = (body?.content ?? "").trim();
  if (!content || content.length < 3) return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
  if (content.length > 500_000) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  // Persist the raw text to Storage + a files row for BOTH uploads and pasted notes, so nothing is lost
  // if the graph engine is offline; only uploads are reported to the engine as source_type "file".
  const isUpload = body?.kind === "file";
  const sourceType: "file" | "manual" = isUpload ? "file" : "manual";
  const baseName = isUpload ? (body?.filename ?? "upload.txt") : `${title || "note"}.md`;
  const name = baseName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const storagePath = `${user.id}/${randomUUID()}-${name}`;
  const up = await supabase.storage.from("user-files").upload(storagePath, new Blob([content], { type: "text/plain" }), { contentType: "text/plain", upsert: false });
  if (up.error) return NextResponse.json({ error: `UPLOAD_FAILED: ${up.error.message}` }, { status: 500 });
  const { data: row, error } = await supabase
    .from("files")
    .insert({ user_id: user.id, name, storage_path: storagePath, type: name.endsWith(".md") ? "text/markdown" : "text/plain", size_bytes: content.length, folder: isUpload ? "uploads" : "notes" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: `FILE_ROW_FAILED: ${error.message}` }, { status: 500 });
  const fileId: string = row.id;
  const sourceId: string = isUpload ? row.id : randomUUID();

  const res = (await ingestToGraph({ user_id: user.id, source_type: sourceType, source_id: sourceId, title: title || (body?.filename ?? "Untitled note"), content })) as
    | { chunks?: number; nodes?: number; edges?: number; node_count?: number; edge_count?: number }
    | null;

  const chunks = res?.chunks ?? res?.nodes ?? res?.node_count ?? 0;
  const edges = res?.edges ?? res?.edge_count ?? 0;
  if (fileId && res) {
    await supabase.from("files").update({ graphify_indexed: true, graphify_node_count: chunks }).eq("id", fileId);
  }
  return NextResponse.json({ ok: true, fileId, sourceId, stored: true, chunks, edges, engine: env.graphEngineUrl ? (res ? "graph" : "unreachable") : "offline" });
}
