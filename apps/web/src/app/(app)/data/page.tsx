import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { FolderRail } from "@/components/data/folder-rail";
import { DataTabs } from "@/components/data/data-tabs";
import { FilesTab } from "@/components/data/files-tab";
import { SheetsList } from "@/components/data/sheets-list";
import { SheetGrid } from "@/components/data/sheet-grid";
import { DocsTab } from "@/components/data/docs-tab";
import { ConnectionsTab } from "@/components/data/connections-tab";
import { UNFILED, type DataTab } from "@/components/data/nav";
import type { SheetColumn } from "./actions";

export const metadata = { title: "Data" };

const TAB_IDS: DataTab[] = ["files", "sheets", "docs", "connections"];

function inFolder(folder: string | undefined, value: string | null) {
  if (!folder) return true;
  if (folder === UNFILED) return value === null;
  return value === folder;
}
function matches(q: string, ...fields: string[]) {
  if (!q) return true;
  const s = q.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(s));
}

export default async function DataPage(props: PageProps<"/data">) {
  const sp = await props.searchParams;
  const tab: DataTab = TAB_IDS.includes(sp.tab as DataTab) ? (sp.tab as DataTab) : "files";
  const folder = typeof sp.folder === "string" && sp.folder ? sp.folder.slice(0, 60) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const open = typeof sp.open === "string" ? sp.open : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: files }, { data: docs }, { data: tables }] = await Promise.all([
    supabase.from("files").select("id, name, type, size_bytes, folder, created_at, graphify_indexed, graphify_node_count").order("created_at", { ascending: false }),
    supabase.from("user_docs").select("id, title, folder, updated_at").order("updated_at", { ascending: false }),
    supabase.from("user_tables").select("id, name, columns, icon, folder, updated_at").order("updated_at", { ascending: false }),
  ]);

  // Folders are virtual: the union of what things are filed under.
  const counts = new Map<string, number>();
  let unfiled = 0;
  for (const f of [...(files ?? []), ...(docs ?? []), ...(tables ?? [])]) {
    if (f.folder) counts.set(f.folder, (counts.get(f.folder) ?? 0) + 1);
    else unfiled++;
  }
  if (folder && folder !== UNFILED && !counts.has(folder)) counts.set(folder, 0);
  const folders = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  const total = (files?.length ?? 0) + (docs?.length ?? 0) + (tables?.length ?? 0);

  let content: React.ReactNode = null;
  if (tab === "files") {
    const list = (files ?? []).filter((f) => inFolder(folder, f.folder) && matches(q, f.name));
    content = <FilesTab files={list} folders={folders.map((f) => f.name)} currentFolder={folder} />;
  } else if (tab === "sheets") {
    const openSheet = open ? (tables ?? []).find((t) => t.id === open) : undefined;
    if (openSheet) {
      const { data: rows } = await supabase.from("user_rows").select("id, data").eq("table_id", openSheet.id).order("created_at");
      content = (
        <SheetGrid
          sheet={{ id: openSheet.id, name: openSheet.name, folder: openSheet.folder, columns: (Array.isArray(openSheet.columns) ? openSheet.columns : []) as SheetColumn[] }}
          rows={(rows ?? []).map((r) => ({ id: r.id, data: (r.data && typeof r.data === "object" && !Array.isArray(r.data) ? r.data : {}) as Record<string, string> }))}
          folders={folders.map((f) => f.name)}
          currentFolder={folder}
        />
      );
    } else {
      const list = (tables ?? []).filter((t) => inFolder(folder, t.folder) && matches(q, t.name));
      content = <SheetsList sheets={list.map((t) => ({ id: t.id, name: t.name, icon: t.icon, folder: t.folder, updated_at: t.updated_at, columnCount: Array.isArray(t.columns) ? t.columns.length : 0 }))} currentFolder={folder} />;
    }
  } else if (tab === "docs") {
    const list = (docs ?? []).filter((d) => inFolder(folder, d.folder) && matches(q, d.title));
    const ids = (docs ?? []).map((d) => d.id);
    const connected = new Map<string, number>();
    if (ids.length) {
      const { data: nodes } = await adminClient().from("knowledge_nodes").select("source_id").eq("user_id", user.id).eq("source_type", "manual").in("source_id", ids);
      for (const n of nodes ?? []) if (n.source_id) connected.set(n.source_id, (connected.get(n.source_id) ?? 0) + 1);
    }
    const openDoc = open ? (await supabase.from("user_docs").select("id, title, content_md, folder").eq("id", open).maybeSingle()).data : null;
    content = (
      <DocsTab
        docs={list.map((d) => ({ ...d, connected: connected.get(d.id) ?? 0 }))}
        openDoc={openDoc ? { ...openDoc, connected: connected.get(openDoc.id) ?? 0 } : null}
        folders={folders.map((f) => f.name)}
        currentFolder={folder}
      />
    );
  } else {
    content = <ConnectionsTab engineConfigured={Boolean(env.graphEngineUrl)} />;
  }

  return (
    <div className="max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Data</h1>
        <p className="text-fg-muted">Your files, sheets and docs — kept in folders, ready for your apps.</p>
      </header>
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-8 items-start">
        <FolderRail folders={folders} total={total} unfiled={unfiled} currentFolder={folder} tab={tab} />
        <div className="space-y-6 min-w-0">
          <DataTabs tab={tab} folder={folder} q={q} showSearch={tab !== "connections" && !open} />
          {content}
        </div>
      </div>
    </div>
  );
}
