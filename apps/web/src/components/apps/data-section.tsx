"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { updateInstanceData } from "@/app/(app)/my-apps/actions";
import type { DataLists, DataOption, InstanceData, InstanceDetail } from "./types";

function Picker({ title, empty, options, chosen, onToggle }: { title: string; empty: string; options: DataOption[]; chosen: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-fg-faint">{title}{options.length > 0 && <span className="num ml-2 normal-case">{chosen.length}/{options.length}</span>}</p>
      {options.length === 0 ? (
        <p className="text-sm text-fg-faint">{empty}</p>
      ) : (
        <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {options.map((o) => {
            const on = chosen.includes(o.id);
            return (
              <li key={o.id}>
                <label className={cn("flex items-center gap-3 squircle rounded-2 px-3 py-2 cursor-pointer select-none border transition", on ? "bg-bg-elev-2 border-line-strong" : "border-transparent hover:bg-bg-elev-2")}>
                  <input type="checkbox" className="size-4 accent-amber" checked={on} onChange={() => onToggle(o.id)} />
                  <span className="truncate text-sm">{o.label}</span>
                  {o.hint && <span className="text-xs text-fg-faint ml-auto shrink-0">{o.hint}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Fresh data (the web lookup) + your data (files, docs, sheets, a note) — included on every run. */
export function DataSection({ detail, lists }: { detail: InstanceDetail; lists: DataLists }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial: InstanceData = { file_ids: detail.data.file_ids ?? [], doc_ids: detail.data.doc_ids ?? [], sheet_ids: detail.data.sheet_ids ?? [], note: detail.data.note ?? "" };
  const [data, setData] = useState<InstanceData>(initial);
  const initialFresh = String(detail.config.needs_fresh ?? "No").toLowerCase() === "yes" ? "Yes" : "No";
  const [fresh, setFresh] = useState<"Yes" | "No">(initialFresh);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(data) !== JSON.stringify(initial) || fresh !== initialFresh;

  const toggle = (key: "file_ids" | "doc_ids" | "sheet_ids", id: string) => {
    const cur = data[key] ?? [];
    setData({ ...data, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  function save() {
    start(async () => {
      setMsg(null);
      const r = await updateInstanceData(detail.id, data, detail.hasFreshToggle ? fresh : undefined);
      setMsg(r.ok ? "Saved. Attached data is included on every run." : r.error);
      router.refresh();
    });
  }

  async function upload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const content = await file.text();
      const res = await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "file", filename: file.name, title: file.name, content }) });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; fileId?: string; error?: string };
      if (!res.ok || !j.ok || !j.fileId) { setMsg(j.error === "EMPTY_CONTENT" ? "That file looks empty." : "Upload didn't work — try a .txt, .md or .csv file."); return; }
      const fileId = j.fileId;
      const next = { ...data, file_ids: [...(data.file_ids ?? []), fileId] };
      setData(next);
      const r = await updateInstanceData(detail.id, next, detail.hasFreshToggle ? fresh : undefined);
      setMsg(r.ok ? `Uploaded “${file.name}” and attached it.` : r.error);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="space-y-6">
      <div className="space-y-1">
        <CardTitle className="text-xl">Data</CardTitle>
        <CardHint>Attached data is included every time this app runs.</CardHint>
      </div>

      {detail.hasFreshToggle && (
        <div className="flex items-center justify-between gap-4 squircle rounded-3 bg-bg-elev-2 p-4">
          <div>
            <p className="font-title font-medium">Fresh data</p>
            <p className="text-sm text-fg-muted">Look things up on the web each run.</p>
          </div>
          <button type="button" role="switch" aria-checked={fresh === "Yes"} onClick={() => setFresh(fresh === "Yes" ? "No" : "Yes")} className={cn("relative h-7 w-12 rounded-full transition border", fresh === "Yes" ? "bg-green border-transparent" : "bg-bg border-line-strong")}>
            <span className={cn("absolute top-0.5 size-6 rounded-full bg-fg transition", fresh === "Yes" ? "left-5 bg-black" : "left-0.5")} />
          </button>
        </div>
      )}

      <div className="space-y-5">
        <p className="font-title font-medium">Your data</p>
        <div className="grid md:grid-cols-3 gap-6">
          <Picker title="Files" empty="No files yet — upload one below." options={lists.files} chosen={data.file_ids ?? []} onToggle={(id) => toggle("file_ids", id)} />
          <Picker title="Docs" empty="No docs yet." options={lists.docs} chosen={data.doc_ids ?? []} onToggle={(id) => toggle("doc_ids", id)} />
          <Picker title="Sheets" empty="No sheets yet." options={lists.sheets} chosen={data.sheet_ids ?? []} onToggle={(id) => toggle("sheet_ids", id)} />
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">A note for the app</p>
          <Textarea value={data.note ?? ""} onChange={(e) => setData({ ...data, note: e.target.value })} placeholder="Anything it should always know — your offer, your audience, what to avoid…" className="min-h-24" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.csv,.tsv,.json,text/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <Button phase="ghost" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Upload a file"}</Button>
          <span className="text-xs text-fg-faint">Text files for now (.txt, .md, .csv). It&apos;s attached to this app as soon as it lands.</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button phase="amber" size="sm" disabled={!dirty || pending} onClick={save}>{pending ? "Saving…" : "Save data"}</Button>
        {dirty && !pending && <Button phase="ghost" size="sm" onClick={() => { setData(initial); setFresh(initialFresh); }}>Undo</Button>}
        {msg && <span className="text-xs text-fg-muted">{msg}</span>}
      </div>
    </Card>
  );
}
