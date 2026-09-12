import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TEXT_EXT = /\.(txt|md|markdown|csv|json|log|html?|xml|ya?ml|tsv)$/i;
function isTextLike(name: string, type: string | null | undefined) {
  return (type ?? "").startsWith("text/") || type === "application/json" || TEXT_EXT.test(name);
}

/** Preview for one of the user's files: text content inline, or a short-lived link for everything else. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/data/files/[id]">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  const { data: file } = await supabase.from("files").select("id, name, type, storage_path, size_bytes").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!file) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (isTextLike(file.name, file.type) && (file.size_bytes ?? 0) <= 400_000) {
    const dl = await supabase.storage.from("user-files").download(file.storage_path);
    if (dl.error || !dl.data) return NextResponse.json({ error: "READ_FAILED" }, { status: 500 });
    const content = await dl.data.text();
    return NextResponse.json({ kind: "text", name: file.name, content: content.slice(0, 200_000), truncated: content.length > 200_000 });
  }
  const signed = await supabase.storage.from("user-files").createSignedUrl(file.storage_path, 600, { download: file.name });
  if (signed.error || !signed.data) return NextResponse.json({ error: "LINK_FAILED" }, { status: 500 });
  return NextResponse.json({ kind: "url", name: file.name, url: signed.data.signedUrl });
}
