"use client";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardHint } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateManifest, crewIdsOf, type AppManifest } from "@/lib/engine/app-manifest";
import { saveManifest, togglePublish, rollbackApp, estimateApp } from "../actions";

type Ver = { version: number; changelog: string | null; created_at: string };
type R = { ok: boolean; message: string; extra?: unknown };

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-wide text-fg-faint">{label}</span>
      {children}
      {hint && <span className="block text-xs text-fg-faint">{hint}</span>}
    </label>
  );
}

export function AppEditor({ manifest, version, knownCrews, versions }: { manifest: AppManifest; version: number; knownCrews: string[]; versions: Ver[] }) {
  const router = useRouter();
  const [m, setM] = useState<AppManifest>(manifest);
  const [configText, setConfigText] = useState(JSON.stringify(manifest.config_schema, null, 2));
  const [workflowText, setWorkflowText] = useState(JSON.stringify(manifest.workflow_def, null, 2));
  const [changelog, setChangelog] = useState("");
  const [res, setRes] = useState<R | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof AppManifest>(k: K, v: AppManifest[K]) => setM((s) => ({ ...s, [k]: v }));

  // Build the live manifest from the form + JSON editors; collect parse/validation errors.
  const { built, errors } = useMemo(() => {
    const errs: string[] = [];
    let config: unknown = [];
    let workflow: unknown = { steps: [] };
    try { config = JSON.parse(configText); } catch { errs.push("config_schema: invalid JSON"); }
    try { workflow = JSON.parse(workflowText); } catch { errs.push("workflow_def: invalid JSON"); }
    const candidate = { ...m, config_schema: config as AppManifest["config_schema"], workflow_def: workflow as AppManifest["workflow_def"] };
    if (!errs.length) errs.push(...validateManifest(candidate, knownCrews));
    return { built: candidate as AppManifest, errors: errs };
  }, [m, configText, workflowText, knownCrews]);

  const crews = crewIdsOf({ workflow_def: built.workflow_def });
  const valid = errors.length === 0;

  const doExport = () => {
    const blob = new Blob([JSON.stringify(built, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${m.slug}.app.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
      {/* LEFT — editor */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl">{m.icon || "▫"}</span>
          <h2 className="text-2xl font-medium">{m.name}</h2>
          <span className="num text-sm text-fg-faint">{m.slug} · v{version}</span>
          {m.is_published ? <Badge tone="green">published</Badge> : <Badge tone="amber">draft</Badge>}
          {crews.length ? <Badge tone="violet">crew: {crews.join(", ")}</Badge> : <Badge tone="sky">data-only</Badge>}
        </div>

        <Card className="space-y-4">
          <CardTitle>Metadata</CardTitle>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name"><Input value={m.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Icon (emoji)"><Input value={m.icon} onChange={(e) => set("icon", e.target.value)} /></Field>
            <Field label="Category"><Input value={m.category} onChange={(e) => set("category", e.target.value)} /></Field>
            <Field label="Autonomy level">
              <select className="bg-bg-elev border border-line rounded-2 px-3 h-12 w-full" value={m.autonomy_level} onChange={(e) => set("autonomy_level", Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>1 — fixed pipeline</option><option value={2}>2 — branching</option><option value={3}>3 — crew/agent</option>
              </select>
            </Field>
            <Field label="Est. credit / run (USD)"><Input className="num" value={String(m.est_credit_cost)} onChange={(e) => set("est_credit_cost", Number(e.target.value) || 0)} /></Field>
            <Field label="Sort order"><Input className="num" value={String(m.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} /></Field>
          </div>
          <Field label="Description"><textarea className="w-full bg-bg-elev-2 border border-line rounded-2 p-2 text-sm" rows={2} value={m.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Who it's for"><Input value={m.who_for} onChange={(e) => set("who_for", e.target.value)} /></Field>
          <Field label="Tags (comma-separated)"><Input value={m.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="Brief template" hint="Uses {{key}} placeholders from the config questions."><Input value={m.brief_template} onChange={(e) => set("brief_template", e.target.value)} /></Field>
        </Card>

        <Card className="space-y-2">
          <CardTitle>Config schema <span className="text-fg-faint text-sm font-normal">— the briefing questions</span></CardTitle>
          <CardHint>Array of {`{key, question, type: text|choice|multi, options?, placeholder?}`}.</CardHint>
          <textarea className="w-full h-56 bg-bg-elev-2 border border-line rounded-2 p-3 text-xs num" value={configText} onChange={(e) => setConfigText(e.target.value)} spellCheck={false} />
        </Card>

        <Card className="space-y-2">
          <CardTitle>Workflow <span className="text-fg-faint text-sm font-normal">— the build</span></CardTitle>
          <CardHint>{`{ "steps": [ { id, kind: search|crawl|llm|agent|crew, ... } ] }`}. Crew steps need crew_id + schema (code shipped in crew.ts).</CardHint>
          <textarea className="w-full h-56 bg-bg-elev-2 border border-line rounded-2 p-3 text-xs num" value={workflowText} onChange={(e) => setWorkflowText(e.target.value)} spellCheck={false} />
        </Card>

        {errors.length > 0 && (
          <div className="squircle rounded-3 border border-red/40 bg-coral-soft p-4 space-y-1">
            <p className="text-sm font-medium text-coral">{errors.length} issue{errors.length === 1 ? "" : "s"} to fix before saving</p>
            <ul className="text-xs text-fg-muted list-disc pl-5 space-y-0.5">{errors.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <Card className="space-y-3">
          <Field label="Changelog (for this version)"><Input value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="what changed" /></Field>
          <div className="flex flex-wrap gap-2">
            <Button phase="green" disabled={pending || !valid} onClick={() => start(async () => { const r = await saveManifest(m.slug, built, changelog); setRes(r); if (r.ok) { setChangelog(""); router.refresh(); } })}>Save version</Button>
            <Button phase={m.is_published ? "ghost" : "amber"} disabled={pending} onClick={() => start(async () => { const r = await togglePublish(m.slug, !m.is_published); setRes(r); if (r.ok) { set("is_published", !m.is_published); router.refresh(); } })}>{m.is_published ? "Unpublish" : "Publish"}</Button>
            <Button phase="ghost" disabled={pending || !valid} onClick={() => start(async () => setRes(await estimateApp(built)))}>Validate & estimate</Button>
            <Button phase="ghost" onClick={doExport}>Export JSON</Button>
          </div>
          {res && (
            <p className={`text-sm ${res.ok ? "text-green" : "text-red"}`}>
              {res.message}
              {Array.isArray(res.extra) && (res.extra as string[]).length > 0 && <span className="block text-xs text-fg-faint mt-1">{(res.extra as string[]).join(" · ")}</span>}
            </p>
          )}
        </Card>
      </div>

      {/* RIGHT — version history */}
      <div className="space-y-3">
        <Card className="space-y-3">
          <CardTitle>Version history</CardTitle>
          <CardHint>Every save snapshots the previous version. Roll back to restore it (as a new version).</CardHint>
          {versions.length === 0 ? (
            <CardHint>No prior versions yet.</CardHint>
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.version} className="py-2 flex items-center gap-2">
                  <span className="num text-sm">v{v.version}</span>
                  <span className="text-xs text-fg-muted truncate flex-1">{v.changelog || "—"}</span>
                  <span className="text-[11px] text-fg-faint num">{new Date(v.created_at).toLocaleDateString()}</span>
                  <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const r = await rollbackApp(m.slug, v.version); setRes(r); if (r.ok) router.refresh(); })}>Roll back</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
