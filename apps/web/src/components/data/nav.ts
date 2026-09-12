export type DataTab = "files" | "sheets" | "docs" | "connections";
export const TABS: { id: DataTab; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "sheets", label: "Sheets" },
  { id: "docs", label: "Docs" },
  { id: "connections", label: "Connections" },
];
export const UNFILED = "_unfiled";

/** `folder`: undefined = All, UNFILED = no folder, otherwise a folder name. */
export function dataHref(p: { tab?: DataTab; folder?: string; q?: string; open?: string }) {
  const sp = new URLSearchParams();
  if (p.tab && p.tab !== "files") sp.set("tab", p.tab);
  if (p.folder) sp.set("folder", p.folder);
  if (p.q) sp.set("q", p.q);
  if (p.open) sp.set("open", p.open);
  const s = sp.toString();
  return s ? `/data?${s}` : "/data";
}

/** Folder to assign to something created while a folder is selected. */
export function folderForNew(folder: string | undefined): string | null {
  return folder && folder !== UNFILED ? folder : null;
}

export function fmtBytes(n: number | null | undefined) {
  const b = n ?? 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
