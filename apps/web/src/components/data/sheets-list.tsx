"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSheet } from "@/app/(app)/data/actions";
import { slugKey } from "./csv";
import { dataHref, fmtDate, folderForNew } from "./nav";

export type SheetSummary = { id: string; name: string; icon: string | null; folder: string | null; updated_at: string; columnCount: number };

export function SheetsList({ sheets, currentFolder }: { sheets: SheetSummary[]; currentFolder?: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [cols, setCols] = useState("Name, Notes");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () => {
    setError(null);
    const columns = cols.split(",").map((s) => s.trim()).filter(Boolean).map((label) => ({ key: slugKey(label), label, type: "text" as const }));
    start(async () => {
      const r = await createSheet(name, columns, folderForNew(currentFolder));
      if (!r.ok) setError(r.error);
      else router.push(dataHref({ tab: "sheets", folder: currentFolder, open: r.id }));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {!creating && <Button size="sm" phase="amber" onClick={() => setCreating(true)}>New sheet</Button>}
      </div>
      {creating && (
        <Card className="space-y-4 max-w-xl">
          <div className="space-y-1">
            <CardHint>Sheet name</CardHint>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Leads" onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
          </div>
          <div className="space-y-1">
            <CardHint>Starting columns, separated by commas</CardHint>
            <Input value={cols} onChange={(e) => setCols(e.target.value)} placeholder="Name, Email, Status" onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="flex gap-3">
            <Button size="sm" phase="green" disabled={pending || !name.trim()} onClick={create}>{pending ? "Creating…" : "Create"}</Button>
            <Button size="sm" phase="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}
      {sheets.length === 0 && !creating ? (
        <Card className="py-14 text-center space-y-2">
          <p className="text-2xl font-title">No sheets here yet</p>
          <CardHint>A sheet is a simple table — like a spreadsheet. Make one, or paste in a CSV.</CardHint>
        </Card>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sheets.map((s) => (
            <li key={s.id}>
              <Link href={dataHref({ tab: "sheets", folder: currentFolder, open: s.id })} className="squircle block rounded-3 border border-line bg-bg-elev hover:bg-bg-elev-2 p-5 space-y-3 transition">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none text-fg-muted">{s.icon ?? "▦"}</span>
                  <span className="min-w-0 flex-1 font-medium truncate">{s.name}</span>
                </div>
                <div className="flex gap-3 text-xs text-fg-faint">
                  <span><span className="num">{s.columnCount}</span> columns</span>
                  <span className="num">{fmtDate(s.updated_at)}</span>
                  {s.folder && <span className="ml-auto truncate">{s.folder}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
