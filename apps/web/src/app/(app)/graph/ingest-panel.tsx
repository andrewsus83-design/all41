"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";

type Res = { ok: boolean; chunks: number; edges: number; engine: string; error?: string };

export function IngestPanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return setFile(null);
    if (!/\.(txt|md|markdown)$/i.test(f.name)) { setRes({ ok: false, chunks: 0, edges: 0, engine: "", error: "Only .txt and .md files for now." }); return; }
    const content = await f.text();
    setFile({ name: f.name, content });
    if (!title) setTitle(f.name.replace(/\.(txt|md|markdown)$/i, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRes(null);
    try {
      const body = file ? { kind: "file", filename: file.name, title, content: file.content } : { kind: "note", title, content: text };
      const r = await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) setRes({ ok: false, chunks: 0, edges: 0, engine: "", error: j.error ?? `HTTP ${r.status}` });
      else { setRes(j); setText(""); setTitle(""); setFile(null); router.refresh(); }
    } catch (err) {
      setRes({ ok: false, chunks: 0, edges: 0, engine: "", error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle className="text-xl">Add to your graph</CardTitle>
        <CardHint>Paste a note or upload a .txt / .md. It gets chunked, embedded, and linked.</CardHint>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Input placeholder="Title (e.g. Q3 pricing notes)" value={title} onChange={(e) => setTitle(e.target.value)} />
        {!file && <Textarea placeholder="Paste text here…" value={text} onChange={(e) => setText(e.target.value)} />}
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-fg-muted cursor-pointer">
            <span className="squircle inline-flex h-9 items-center px-4 rounded-1 border border-line-strong hover:bg-bg-elev-2">{file ? `File: ${file.name}` : "Upload .txt / .md"}</span>
            <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {file && <button type="button" className="text-xs text-fg-faint hover:text-fg" onClick={() => setFile(null)}>clear file</button>}
          <Button type="submit" phase="amber" size="sm" disabled={busy || (!file && text.trim().length < 3)}>{busy ? "Ingesting…" : "Ingest"}</Button>
          {res && res.ok && (
            <span className="text-sm text-green">
              <span className="num">{res.chunks}</span> chunks · <span className="num">{res.edges}</span> edges
              {res.engine !== "graph" && <span className="text-amber"> · graph engine {res.engine} — stored, not yet indexed</span>}
            </span>
          )}
          {res && !res.ok && <span className="text-sm text-red">{res.error}</span>}
        </div>
      </form>
    </Card>
  );
}
