"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHint } from "@/components/ui/card";
import { addRow, deleteRow, deleteSheet, importRows, moveSheet, renameSheet, setSheetColumns, updateRow, type SheetColumn } from "@/app/(app)/data/actions";
import { parseCsv, slugKey, toCsv } from "./csv";
import { dataHref } from "./nav";
import { FolderPicker } from "./folder-picker";

export type SheetRow = { id: string; data: Record<string, string> };
type Sheet = { id: string; name: string; folder: string | null; columns: SheetColumn[] };

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, SheetRow>();

export function SheetGrid({ sheet, rows: serverRows, folders, currentFolder }: { sheet: Sheet; rows: SheetRow[]; folders: string[]; currentFolder?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(serverRows);
  const [cols, setCols] = useState(sheet.columns);
  // Adopt fresh server data when the page re-renders after a save.
  const [seen, setSeen] = useState({ rows: serverRows, cols: sheet.columns });
  if (seen.rows !== serverRows || seen.cols !== sheet.columns) {
    setSeen({ rows: serverRows, cols: sheet.columns });
    setRows(serverRows);
    setCols(sheet.columns);
  }

  const [name, setName] = useState(sheet.name);
  const [editing, setEditing] = useState<{ rowId: string; key: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [colEdit, setColEdit] = useState<{ key: string; label: string; type: SheetColumn["type"] } | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newCol, setNewCol] = useState<{ label: string; type: SheetColumn["type"] }>({ label: "", type: "text" });
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const columns = useMemo(
    () => helper.columns(cols.map((c) => helper.accessor((r) => r.data[c.key] ?? "", { id: c.key, header: c.label }))),
    [cols],
  );
  const table = useTable({ features, columns, data: rows });

  /* ---- cell editing ---- */
  const beginEdit = (rowId: string, key: string) => {
    const r = rows.find((x) => x.id === rowId);
    setEditing({ rowId, key });
    setDraft(r?.data[key] ?? "");
  };
  const commitEdit = (move: "down" | "right" | "none") => {
    if (!editing) return;
    const { rowId, key } = editing;
    const r = rows.find((x) => x.id === rowId);
    if (r && (r.data[key] ?? "") !== draft) {
      const data = { ...r.data, [key]: draft };
      setRows((rs) => rs.map((x) => (x.id === rowId ? { ...x, data } : x)));
      start(() => updateRow(rowId, data));
    }
    if (move === "none") { setEditing(null); return; }
    const ri = rows.findIndex((x) => x.id === rowId);
    const ci = cols.findIndex((c) => c.key === key);
    let nr = ri, nc = ci;
    if (move === "down") nr = ri + 1;
    else { nc = ci + 1; if (nc >= cols.length) { nc = 0; nr = ri + 1; } }
    if (nr < rows.length) {
      const next = rows[nr];
      setEditing({ rowId: next.id, key: cols[nc].key });
      setDraft(next.data[cols[nc].key] ?? "");
    } else setEditing(null);
  };

  /* ---- rows ---- */
  const onAddRow = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const r = await addRow(sheet.id, {});
      if (r.ok) { setRows((rs) => [...rs, { id: r.id, data: {} }]); if (cols[0]) { setEditing({ rowId: r.id, key: cols[0].key }); setDraft(""); } }
      else setMsg(r.error);
    } finally {
      setAdding(false);
    }
  };
  const onDeleteRow = (rowId: string) => { setRows((rs) => rs.filter((r) => r.id !== rowId)); start(() => deleteRow(rowId)); };

  /* ---- columns ---- */
  const saveCols = (next: SheetColumn[]) =>
    start(async () => {
      const r = await setSheetColumns(sheet.id, next);
      if (r.ok) setCols(r.columns); else setMsg(r.error);
    });
  const onAddCol = () => {
    const label = newCol.label.trim();
    if (!label) return;
    let key = slugKey(label);
    while (cols.some((c) => c.key === key)) key += "_2";
    saveCols([...cols, { key, label, type: newCol.type }]);
    setAddingCol(false);
    setNewCol({ label: "", type: "text" });
  };
  const onSaveCol = () => {
    if (!colEdit) return;
    saveCols(cols.map((c) => (c.key === colEdit.key ? { ...c, label: colEdit.label.trim() || c.label, type: colEdit.type } : c)));
    setColEdit(null);
  };
  const onDeleteCol = (key: string) => {
    if (cols.length <= 1) { setMsg("A sheet needs at least one column."); return; }
    saveCols(cols.filter((c) => c.key !== key));
    setColEdit(null);
  };

  /* ---- import / export ---- */
  const doImport = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length < 1) { setMsg("Nothing to import."); return; }
    const [header, ...body] = parsed;
    const incoming: SheetColumn[] = header.map((h, i) => ({ key: slugKey(h || `col_${i + 1}`), label: h.trim() || `Column ${i + 1}`, type: "text" }));
    const data = body.map((r) => Object.fromEntries(incoming.map((c, i) => [c.key, r[i] ?? ""])));
    start(async () => {
      const r = await importRows(sheet.id, incoming, data);
      if (!r.ok) { setMsg(r.error); return; }
      setMsg(`${r.added} rows added.`);
      setImportOpen(false);
      setCsvText("");
      router.refresh();
    });
  };
  const doExport = () => {
    const csv = toCsv(cols.map((c) => c.label), rows.map((r) => cols.map((c) => r.data[c.key] ?? "")));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${sheet.name.replace(/[^\w.-]+/g, "_") || "sheet"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const commitName = () => {
    const n = name.trim();
    if (n && n !== sheet.name) start(() => renameSheet(sheet.id, n)); else setName(sheet.name);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={dataHref({ tab: "sheets", folder: currentFolder })} className="text-sm text-fg-muted hover:text-fg">← Sheets</Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="bg-transparent font-title text-2xl font-medium outline-none border-b border-transparent focus:border-amber min-w-0 flex-1"
          title="Click to rename"
        />
        <div className="w-44"><FolderPicker value={sheet.folder} folders={folders} onChange={(f) => start(() => moveSheet(sheet.id, f))} /></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" phase="amber" onClick={onAddRow} disabled={adding}>Add row</Button>
        <Button size="sm" phase="ghost" onClick={() => setAddingCol((v) => !v)}>Add column</Button>
        <Button size="sm" phase="ghost" onClick={() => setImportOpen((v) => !v)}>Import CSV</Button>
        <Button size="sm" phase="ghost" onClick={doExport} disabled={!rows.length}>Export CSV</Button>
        <Link href={`/ai?sheet=${sheet.id}`} className="squircle inline-flex items-center h-9 px-4 rounded-1 text-sm font-title font-medium bg-green text-white hover:brightness-110">Send to AI</Link>
        <span className="ml-auto text-xs text-fg-faint"><span className="num">{rows.length}</span> rows · <span className="num">{cols.length}</span> columns</span>
      </div>

      {addingCol && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="space-y-1 text-sm"><CardHint>Column name</CardHint>
            <input autoFocus value={newCol.label} onChange={(e) => setNewCol({ ...newCol, label: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") onAddCol(); }} className="h-10 bg-bg-elev border border-line rounded-2 px-3 outline-none focus:border-amber" placeholder="e.g. Email" />
          </label>
          <label className="space-y-1 text-sm"><CardHint>Type</CardHint>
            <select value={newCol.type} onChange={(e) => setNewCol({ ...newCol, type: e.target.value as SheetColumn["type"] })} className="h-10 bg-bg-elev border border-line rounded-2 px-3 outline-none">
              <option value="text">Text</option><option value="number">Number</option><option value="date">Date</option>
            </select>
          </label>
          <Button size="sm" phase="green" onClick={onAddCol} disabled={!newCol.label.trim()}>Add</Button>
          <Button size="sm" phase="ghost" onClick={() => setAddingCol(false)}>Cancel</Button>
        </Card>
      )}

      {importOpen && (
        <Card className="space-y-3 p-4">
          <CardHint>Paste CSV below (first line = column names), or pick a .csv file. New columns are added automatically.</CardHint>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={"Name,Email\nAda,ada@example.com"} className="w-full min-h-28 bg-bg-elev border border-line rounded-2 p-3 outline-none focus:border-amber num text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" phase="green" onClick={() => doImport(csvText)} disabled={pending || !csvText.trim()}>Import</Button>
            <Button size="sm" phase="ghost" onClick={() => fileRef.current?.click()}>Pick a .csv file</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); e.target.value = ""; }} />
            <Button size="sm" phase="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {msg && <p className="text-sm text-fg-muted">{msg} <button type="button" className="text-fg-faint hover:text-fg" onClick={() => setMsg(null)}>×</button></p>}

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id} className="border-b border-line">
                <th className="w-10" />
                {g.headers.map((h) => {
                  const col = cols.find((c) => c.key === h.column.id)!;
                  const isEdit = colEdit?.key === col.key;
                  return (
                    <th key={h.id} className="text-left px-4 py-3 font-medium text-fg-muted align-top min-w-40 relative">
                      {isEdit ? (
                        <div className="space-y-2 font-normal">
                          <input autoFocus value={colEdit.label} onChange={(e) => setColEdit({ ...colEdit, label: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") onSaveCol(); if (e.key === "Escape") setColEdit(null); }} className="w-full h-9 bg-bg border border-line rounded-1 px-2 outline-none focus:border-amber" />
                          <div className="flex items-center gap-2 text-xs">
                            <select value={colEdit.type} onChange={(e) => setColEdit({ ...colEdit, type: e.target.value as SheetColumn["type"] })} className="h-8 bg-bg border border-line rounded-1 px-2">
                              <option value="text">Text</option><option value="number">Number</option><option value="date">Date</option>
                            </select>
                            <button type="button" onClick={onSaveCol} className="text-green">Save</button>
                            <button type="button" onClick={() => onDeleteCol(col.key)} className="text-red">Delete</button>
                            <button type="button" onClick={() => setColEdit(null)} className="text-fg-faint">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setColEdit({ key: col.key, label: col.label, type: col.type })} className="hover:text-fg text-left w-full" title="Rename, change type or delete">
                          {col.label} <span className="text-fg-faint text-xs font-normal">{col.type !== "text" ? col.type : ""}</span>
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 group">
                <td className="w-10 text-center">
                  <button type="button" aria-label="Delete row" onClick={() => onDeleteRow(row.original.id)} className="text-fg-faint opacity-0 group-hover:opacity-100 hover:text-red">×</button>
                </td>
                {row.getAllCells().map((cell) => {
                  const key = cell.column.id;
                  const rid = row.original.id;
                  const isEdit = editing?.rowId === rid && editing.key === key;
                  const col = cols.find((c) => c.key === key);
                  const value = row.original.data[key] ?? "";
                  return (
                    <td key={cell.id} className={cn("px-0 py-0 align-top", isEdit && "outline outline-2 outline-amber -outline-offset-2")}>
                      {isEdit ? (
                        <input
                          autoFocus
                          value={draft}
                          type={col?.type === "number" ? "number" : col?.type === "date" ? "date" : "text"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit("none")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitEdit("down"); }
                            else if (e.key === "Tab") { e.preventDefault(); commitEdit("right"); }
                            else if (e.key === "Escape") setEditing(null);
                          }}
                          className={cn("w-full h-11 px-4 bg-bg outline-none", col?.type === "number" && "num")}
                        />
                      ) : (
                        <button type="button" onClick={() => beginEdit(rid, key)} className={cn("w-full text-left h-11 px-4 truncate hover:bg-bg-elev-2", col?.type === "number" && "num", !value && "text-fg-faint/40")}>
                          {value || " "}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length + 1} className="px-6 py-10 text-fg-faint text-center">No rows yet. Add a row, or import a CSV.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-fg-faint">Click a cell to edit · Enter saves and moves down · Tab moves right</p>

      <div className="pt-4 border-t border-line">
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-fg-faint hover:text-red">Delete this sheet</button>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-fg-muted">Delete the sheet and all its rows?</span>
            <button type="button" onClick={() => start(async () => { await deleteSheet(sheet.id); router.push(dataHref({ tab: "sheets", folder: currentFolder })); })} className="text-red font-medium">Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-fg-faint hover:text-fg">Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}
