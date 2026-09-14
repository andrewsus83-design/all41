"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApp, importManifest } from "./actions";
import type { AppManifest } from "@/lib/engine/app-manifest";

function starter(slug: string, name: string): AppManifest {
  return {
    slug, name, description: "", category: "marketing", icon: "✨", who_for: "", tags: [], autonomy_level: 1,
    brief_template: "", config_schema: [{ key: "input", question: "What do you need?", type: "text", placeholder: "" }],
    workflow_def: { steps: [{ id: "run", kind: "llm", task_type: "reasoning", schema: "answer", prompt: "Do the task using the context below: {{input}}" }] },
    est_credit_cost: 0.1, is_published: false, sort_order: 100,
  };
}

export function NewAppBar() {
  const router = useRouter();
  const [mode, setMode] = useState<null | "new" | "import">(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" phase="green" onClick={() => { setMode(mode === "new" ? null : "new"); setMsg(null); }}>New app</Button>
        <Button size="sm" phase="ghost" onClick={() => { setMode(mode === "import" ? null : "import"); setMsg(null); }}>Import JSON</Button>
      </div>

      {mode === "new" && (
        <div className="squircle rounded-3 border border-line bg-bg-elev p-4 space-y-2 w-80">
          <Input placeholder="slug (my-app)" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button size="sm" phase="green" disabled={pending || !slug || !name} onClick={() => start(async () => {
            const r = await createApp(starter(slug, name));
            setMsg(r.message);
            if (r.ok) router.push(`/admin/apps/${slug}`);
          })}>Create draft</Button>
          {msg && <p className="text-xs text-fg-muted">{msg}</p>}
        </div>
      )}

      {mode === "import" && (
        <div className="squircle rounded-3 border border-line bg-bg-elev p-4 space-y-2 w-96">
          <textarea className="w-full h-40 bg-bg-elev-2 border border-line rounded-2 p-2 text-xs num" placeholder="paste an app manifest JSON" value={json} onChange={(e) => setJson(e.target.value)} />
          <Button size="sm" phase="green" disabled={pending || !json.trim()} onClick={() => start(async () => {
            const r = await importManifest(json);
            setMsg(r.ok ? r.message : `${r.message}${Array.isArray(r.extra) ? " — " + (r.extra as string[]).join("; ") : ""}`);
            if (r.ok) router.refresh();
          })}>Import</Button>
          {msg && <p className="text-xs text-fg-muted">{msg}</p>}
        </div>
      )}
    </div>
  );
}
