"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { connectDoc, createDoc, deleteDoc, moveDoc, saveDoc } from "@/app/(app)/data/actions";
import { Markdown } from "./markdown";
import { dataHref, fmtDate, folderForNew } from "./nav";
import { FolderPicker } from "./folder-picker";
import { ConnectedChip } from "./files-tab";

export type DocSummary = { id: string; title: string; folder: string | null; updated_at: string; connected: number };
export type OpenDoc = { id: string; title: string; content_md: string; folder: string | null; connected: number };

export function DocsTab({ docs, openDoc, folders, currentFolder }: { docs: DocSummary[]; openDoc: OpenDoc | null; folders: string[]; currentFolder?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onNew = () =>
    start(async () => {
      const r = await createDoc(folderForNew(currentFolder));
      if (r.ok) router.push(dataHref({ tab: "docs", folder: currentFolder, open: r.id })); else setError(r.error);
    });

  return (
    <div className={cn("grid gap-6 items-start", openDoc ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "")}>
      <div className="space-y-4">
        <Button size="sm" phase="amber" className="shrink-0 whitespace-nowrap" onClick={onNew} disabled={pending}>New doc</Button>
        {error && <p className="text-sm text-red">{error}</p>}
        {docs.length === 0 ? (
          <Card className="py-14 text-center space-y-2">
            <p className="text-2xl font-title">No docs here yet</p>
            <CardHint>A doc is a page of writing. Connect it and your apps can use what it says.</CardHint>
          </Card>
        ) : (
          <ul className={cn("gap-3", openDoc ? "flex flex-col" : "grid sm:grid-cols-2 xl:grid-cols-3")}>
            {docs.map((d) => (
              <li key={d.id}>
                <Link
                  href={dataHref({ tab: "docs", folder: currentFolder, open: d.id })}
                  className={cn("squircle block rounded-3 border p-4 space-y-2 transition", openDoc?.id === d.id ? "border-fg bg-bg-elev-2" : "border-line bg-bg-elev hover:bg-bg-elev-2")}
                >
                  <span className="block font-medium truncate">{d.title || "Untitled"}</span>
                  <span className="flex items-center gap-3 text-xs text-fg-faint">
                    <span className="num">{fmtDate(d.updated_at)}</span>
                    {d.connected > 0 && <ConnectedChip />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {openDoc && <DocEditor key={openDoc.id} doc={openDoc} folders={folders} currentFolder={currentFolder} />}
    </div>
  );
}

function DocEditor({ doc, folders, currentFolder }: { doc: OpenDoc; folders: string[]; currentFolder?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content_md);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState<string>("Saved");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [connecting, startConnect] = useTransition();
  const dirty = title !== doc.title || content !== doc.content_md;

  const save = () => {
    if (!dirty) return;
    setSaved("Saving…");
    start(async () => { await saveDoc(doc.id, title, content); setSaved("Saved"); });
  };
  const connect = () => {
    setConnectMsg(null);
    startConnect(async () => {
      if (dirty) await saveDoc(doc.id, title, content);
      const r = await connectDoc(doc.id);
      setConnectMsg(r.ok ? `Connected · ${r.chunks} ${r.chunks === 1 ? "piece" : "pieces"}` : r.error);
    });
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaved("Unsaved"); }}
          onBlur={save}
          placeholder="Title"
          className="flex-1 min-w-48 bg-transparent font-title text-2xl font-medium outline-none border-b border-transparent focus:border-amber"
        />
        <span className="text-xs text-fg-faint">{pending ? "Saving…" : dirty ? "Unsaved" : saved}</span>
        <div className="w-44"><FolderPicker value={doc.folder} folders={folders} onChange={(f) => start(() => moveDoc(doc.id, f))} /></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-1 border border-line overflow-hidden text-sm">
          <button type="button" onClick={() => setPreview(false)} className={cn("px-4 h-9", !preview ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg")}>Write</button>
          <button type="button" onClick={() => setPreview(true)} className={cn("px-4 h-9", preview ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg")}>Preview</button>
        </div>
        <Button size="sm" phase="green" onClick={connect} disabled={connecting || content.trim().length < 3}>{connecting ? "Connecting…" : doc.connected > 0 ? "Reconnect this doc" : "Connect this doc"}</Button>
        {doc.connected > 0 && !connectMsg && <ConnectedChip count={doc.connected} />}
        {connectMsg && <span className={cn("text-sm", connectMsg.startsWith("Connected") ? "text-green" : "text-red")}>{connectMsg}</span>}
        <Link href={dataHref({ tab: "docs", folder: currentFolder })} className="ml-auto text-xs text-fg-faint hover:text-fg">close</Link>
      </div>

      {preview ? (
        <div className="min-h-80 p-4 rounded-2 bg-bg border border-line"><Markdown source={content} /></div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setSaved("Unsaved"); }}
          onBlur={save}
          placeholder="Write here. Simple formatting works: # Heading, **bold**, - list, [link](https://…)"
          className="w-full min-h-80 bg-bg border border-line rounded-2 p-4 outline-none focus:border-amber resize-y leading-relaxed"
        />
      )}
      <p className="text-xs text-fg-faint">Saves when you click away.</p>

      <div className="pt-3 border-t border-line">
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)} className="text-sm text-fg-faint hover:text-red">Delete this doc</button>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-fg-muted">Delete for good?</span>
            <button type="button" onClick={() => start(async () => { await deleteDoc(doc.id); router.push(dataHref({ tab: "docs", folder: currentFolder })); })} className="text-red font-medium">Yes, delete</button>
            <button type="button" onClick={() => setConfirm(false)} className="text-fg-faint hover:text-fg">Keep it</button>
          </div>
        )}
      </div>
    </Card>
  );
}
