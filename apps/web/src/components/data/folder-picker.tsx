"use client";
import { useState } from "react";

/** Pick an existing folder, no folder, or type a new one. */
export function FolderPicker({ value, folders, onChange }: { value: string | null; folders: string[]; onChange: (folder: string | null) => void }) {
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState("");
  const options = value && !folders.includes(value) ? [value, ...folders] : folders;

  if (custom) {
    const commit = () => {
      const n = text.trim();
      setCustom(false);
      setText("");
      if (n) onChange(n);
    };
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setCustom(false); }}
        placeholder="New folder name"
        className="w-full h-10 bg-bg-elev border border-line rounded-2 px-3 outline-none focus:border-amber text-sm"
      />
    );
  }
  return (
    <select
      value={value ?? ""}
      onChange={(e) => { if (e.target.value === "__new") setCustom(true); else onChange(e.target.value || null); }}
      className="w-full h-10 bg-bg-elev border border-line rounded-2 px-3 text-sm outline-none focus:border-amber"
    >
      <option value="">No folder</option>
      {options.map((f) => <option key={f} value={f}>{f}</option>)}
      <option value="__new">New folder…</option>
    </select>
  );
}
