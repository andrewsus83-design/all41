"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { deleteFile, moveFile, renameFile } from "@/app/(app)/data/actions";
import { fmtBytes, fmtDate, folderForNew } from "./nav";
import { FolderPicker } from "./folder-picker";

export type FileRow = { id: string; name: string; type: string | null; size_bytes: number | null; folder: string | null; created_at: string; graphify_indexed: boolean; graphify_node_count: number };
type Preview = { kind: "text"; content: string; truncated?: boolean } | { kind: "url"; url: string } | { kind: "error"; error: string };

function glyph(type: string | null, name: string) {
  const t = type ?? "";
  if (t.startsWith("image/")) return "▣";
  if (t.includes("pdf")) return "▤";
  if (t.includes("csv") || t.includes("sheet") || /\.(csv|xlsx?)$/i.test(name)) return "▦";
  if (t.startsWith("text/") || t.includes("json") || /\.(md|txt)$/i.test(name)) return "≡";
  return "◻";
}
function kind(type: string | null, name: string) {
  const t = type ?? "";
  if (t.startsWith("image/")) return "image";
  if (t.includes("pdf")) return "pdf";
  if (t.includes("markdown") || /\.md$/i.test(name)) return "markdown";
  if (t.includes("csv") || /\.csv$/i.test(name)) return "csv";
  if (t.startsWith("text/")) return "text";
  const ext = name.split(".").pop();
  return ext && ext !== name ? ext.toLowerCase() : "file";
}

export function ConnectedChip({ count }: { count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-1 bg-green-soft text-green text-xs">
      connected{count !== undefined && <> · <span className="num">{count}</span></>}
    </span>
  );
}

export function FilesTab({ files, folders, currentFolder }: { files: FileRow[]; folders: string[]; currentFolder?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = files.find((f) => f.id === selectedId) ?? null;

  async function upload(list: FileList | null) {
    if (!list || !list.length) return;
    setBusy(true);
    let okCount = 0;
    let connected = 0;
    let lastError: string | null = null;
    for (const f of Array.from(list)) {
      setStatus(`Uploading ${f.name}…`);
      const form = new FormData();
      form.set("raw", f);
      form.set("folder", folderForNew(currentFolder) ?? "uploads");
      try {
        const r = await fetch("/api/ingest", { method: "POST", body: form });
        const j = await r.json();
        if (!r.ok) lastError = j.error ?? `HTTP ${r.status}`;
        else { okCount++; if (j.chunks > 0) connected++; }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    setBusy(false);
    setStatus(lastError ? `Something went wrong: ${lastError}` : `${okCount} file${okCount === 1 ? "" : "s"} added${connected ? `, ${connected} connected` : ""}.`);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className={cn("grid gap-6 items-start", selected ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm" phase="amber" className="shrink-0 whitespace-nowrap" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Uploading…" : "Upload files"}</Button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          {status && <span className="text-sm text-fg-muted">{status}</span>}
        </div>
        {files.length === 0 ? (
          <Card className="py-14 text-center space-y-2">
            <p className="text-2xl font-title">No files here yet</p>
            <CardHint>Upload anything — notes, spreadsheets, PDFs. Text files get connected so your apps can use them.</CardHint>
          </Card>
        ) : (
          <ul className={cn("grid gap-3", selected ? "xl:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
            {files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                  className={cn("squircle w-full text-left rounded-3 border p-5 space-y-3 transition", selectedId === f.id ? "border-fg bg-bg-elev-2" : "border-line bg-bg-elev hover:bg-bg-elev-2")}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none text-fg-muted">{glyph(f.type, f.name)}</span>
                    <span className="min-w-0 flex-1 font-medium truncate" title={f.name}>{f.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-fg-faint">
                    <span>{kind(f.type, f.name)}</span>
                    <span className="num">{fmtBytes(f.size_bytes)}</span>
                    <span className="num">{fmtDate(f.created_at)}</span>
                  </div>
                  {f.graphify_indexed && <ConnectedChip count={f.graphify_node_count} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected && <FileDetail key={selected.id} file={selected} folders={folders} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function FileDetail({ file, folders, onClose }: { file: FileRow; folders: string[]; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState(file.name);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch(`/api/data/files/${file.id}`)
      .then(async (r) => (r.ok ? r.json() : { kind: "error", error: (await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}` }))
      .then((j) => alive && setPreview(j))
      .catch((e) => alive && setPreview({ kind: "error", error: String(e) }));
    return () => { alive = false; };
  }, [file.id]);

  const commitName = () => {
    const n = name.trim();
    if (n && n !== file.name) start(() => renameFile(file.id, n));
    else setName(file.name);
  };

  return (
    <Card className={cn("space-y-5 sticky top-6", pending && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="flex-1 min-w-0 bg-transparent font-title text-lg font-medium outline-none border-b border-transparent focus:border-amber"
          title="Click to rename"
        />
        <button type="button" onClick={onClose} className="text-xs text-fg-faint hover:text-fg">close</button>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-fg-faint">
        <span>{kind(file.type, file.name)}</span>
        <span className="num">{fmtBytes(file.size_bytes)}</span>
        <span>added <span className="num">{fmtDate(file.created_at)}</span></span>
        {file.graphify_indexed ? <ConnectedChip count={file.graphify_node_count} /> : <span>not connected</span>}
      </div>

      <div className="space-y-1">
        <CardHint>Folder</CardHint>
        <FolderPicker value={file.folder} folders={folders} onChange={(f) => start(() => moveFile(file.id, f))} />
      </div>

      <div className="space-y-2">
        <CardHint>Preview</CardHint>
        {!preview && <p className="text-sm text-fg-faint pulse-soft">Loading…</p>}
        {preview?.kind === "error" && <p className="text-sm text-red">Could not open this file.</p>}
        {preview?.kind === "text" && (
          <pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-y-auto bg-bg rounded-2 p-4 border border-line font-sans">{preview.content}{preview.truncated ? "\n…" : ""}</pre>
        )}
        {preview?.kind === "url" && (
          <a href={preview.url} className="text-sm text-green underline" target="_blank" rel="noreferrer">Download {file.name}</a>
        )}
      </div>

      <div className="pt-2 border-t border-line">
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)} className="text-sm text-fg-faint hover:text-red">Delete this file</button>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-fg-muted">Delete for good?</span>
            <button type="button" onClick={() => start(async () => { await deleteFile(file.id); onClose(); })} className="text-red font-medium">Yes, delete</button>
            <button type="button" onClick={() => setConfirm(false)} className="text-fg-faint hover:text-fg">Keep it</button>
          </div>
        )}
      </div>
    </Card>
  );
}
