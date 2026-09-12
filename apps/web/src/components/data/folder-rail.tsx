"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { dataHref, UNFILED, type DataTab } from "./nav";

export function FolderRail({ folders, total, unfiled, currentFolder, tab }: { folders: { name: string; count: number }[]; total: number; unfiled: number; currentFolder?: string; tab: DataTab }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const item = (label: string, count: number, folder?: string) => {
    const active = currentFolder === folder;
    return (
      <Link
        key={folder ?? "__all"}
        href={dataHref({ tab, folder })}
        className={cn("squircle rounded-2 px-4 py-2.5 flex items-center justify-between gap-3 transition", active ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg hover:bg-bg-elev")}
      >
        <span className="truncate">{label}</span>
        <span className="num text-xs text-fg-faint">{count}</span>
      </Link>
    );
  };

  const create = () => {
    const n = name.trim().replace(/[\/\\]+/g, " ").slice(0, 60);
    setAdding(false);
    setName("");
    if (n) router.push(dataHref({ tab, folder: n }));
  };

  return (
    <aside className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-fg-faint px-4">Folders</p>
      <nav className="flex flex-col gap-0.5">
        {item("All", total)}
        {folders.map((f) => item(f.name, f.count, f.name))}
        {unfiled > 0 && item("Unfiled", unfiled, UNFILED)}
      </nav>
      {adding ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={create}
          onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") { setAdding(false); setName(""); } }}
          placeholder="Folder name"
          className="w-full bg-bg-elev border border-line rounded-2 px-4 h-10 outline-none focus:border-amber"
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="px-4 py-2 text-sm text-fg-faint hover:text-fg">
          + New folder
        </button>
      )}
    </aside>
  );
}
