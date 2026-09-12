"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import {
  saveKeyAction, removeKeyAction, testKeyAction, testModelAction,
  upsertRouteAction, deleteRouteAction, upsertRateAction, deleteRateAction, saveSettingAction,
} from "./actions";

export type AdminData = {
  providers: Array<{ id: string; label: string; keyName: string; keysUrl: string; suggested: string[]; source: "vault" | "env" | "unset"; masked: string }>;
  otherKeys: Array<{ name: string; source: "vault" | "env" | "unset"; masked: string }>;
  routes: Array<{ task_type: string; model: string; weight: number; is_leader: boolean; updated_at: string }>;
  rates: Array<{ api_provider: string; api_model: string; input_rate: number; output_rate: number; unit: string; source: string | null; updated_at: string }>;
  settings: Record<string, number>;
  bench: Array<{ task_type: string; model: string; score: number; cost_per_run: number | null; latency_ms: number | null; is_leader: boolean; date: string }>;
};

type R = { ok: boolean; message: string; extra?: unknown };

function SourceBadge({ source }: { source: "vault" | "env" | "unset" }) {
  return source === "vault" ? <Badge tone="green">vault</Badge> : source === "env" ? <Badge tone="amber">env</Badge> : <Badge tone="red">not set</Badge>;
}

function Result({ r }: { r?: R | null }) {
  if (!r) return null;
  return (
    <p className={`text-sm ${r.ok ? "text-green" : "text-red"}`}>
      {r.message}
      {Array.isArray(r.extra) && r.extra.length > 0 && <span className="block text-xs text-fg-faint num mt-1">{(r.extra as string[]).join(" · ")}</span>}
    </p>
  );
}

export function AdminClient({ data }: { data: AdminData }) {
  return (
    <div className="space-y-12">
      <KeysSection data={data} />
      <RoutingSection data={data} />
      <RatesSection data={data} />
      <SettingsSection data={data} />
    </div>
  );
}

/* ---------------- Keys ---------------- */
function KeyRow({ name, label, source, masked, keysUrl, provider, hint }: { name: string; label: string; source: "vault" | "env" | "unset"; masked: string; keysUrl?: string; provider?: string; hint?: string }) {
  const [value, setValue] = useState("");
  const [res, setRes] = useState<R | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>{label}</CardTitle>
          <CardHint className="num">{name}{masked ? ` · ${masked}` : ""}</CardHint>
          {hint && <CardHint>{hint}</CardHint>}
        </div>
        <div className="flex items-center gap-2">
          <SourceBadge source={source} />
          {keysUrl && <a href={keysUrl} target="_blank" rel="noreferrer" className="text-xs text-fg-muted hover:text-fg underline">get key ↗</a>}
        </div>
      </div>
      <div className="flex gap-2">
        <Input type="password" placeholder={source === "unset" ? "paste key" : "paste to replace"} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
        <Button size="sm" phase="green" disabled={pending || !value} onClick={() => start(async () => { setRes(await saveKeyAction(name, value)); setValue(""); router.refresh(); })}>Save</Button>
        {provider && (
          <Button size="sm" phase="amber" disabled={pending || (source === "unset" && !value)} onClick={() => start(async () => setRes(await testKeyAction(provider, value || undefined)))}>Test</Button>
        )}
        {source === "vault" && (
          <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { setRes(await removeKeyAction(name)); router.refresh(); })}>Remove</Button>
        )}
      </div>
      <Result r={res} />
    </Card>
  );
}

function KeysSection({ data }: { data: AdminData }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Provider keys</h2>
      <p className="text-sm text-fg-muted">Saved to Supabase Vault (encrypted). The graph engine reads the same vault. Env vars still work as a fallback.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {data.providers.map((p) => (
          <KeyRow key={p.id} name={p.keyName} label={p.label} source={p.source} masked={p.masked} keysUrl={p.keysUrl} provider={p.id} hint={p.suggested.length ? `models: ${p.suggested.join(", ")}` : undefined} />
        ))}
      </div>
      <h3 className="text-lg text-fg-muted pt-4">Billing · jobs · alerts</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {data.otherKeys.map((k) => (
          <KeyRow key={k.name} name={k.name} label={k.name.replace(/_/g, " ").toLowerCase()} source={k.source} masked={k.masked} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Routing ---------------- */
function RoutingSection({ data }: { data: AdminData }) {
  const router = useRouter();
  const [res, setRes] = useState<Record<string, R>>({});
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ task_type: "", model: "", weight: "1.0" });
  const byType = new Map<string, AdminData["routes"]>();
  for (const r of data.routes) byType.set(r.task_type, [...(byType.get(r.task_type) ?? []), r]);
  const benchLatest = new Map<string, AdminData["bench"][number]>();
  for (const b of data.bench) { const k = `${b.task_type}|${b.model}`; if (!benchLatest.has(k)) benchLatest.set(k, b); }
  const key = (t: string, m: string) => `${t}|${m}`;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Routing</h2>
      <p className="text-sm text-fg-muted">Leader runs first; if its provider has no key the next keyed candidate is used; with no keys at all the mock provider runs. The daily benchmark rewrites leaders.</p>
      <div className="space-y-6">
        {[...byType.entries()].map(([taskType, rows]) => (
          <Card key={taskType} className="space-y-2">
            <CardTitle className="uppercase tracking-wide text-sm text-fg-muted">{taskType}</CardTitle>
            <div className="divide-y divide-line">
              {rows.map((r) => {
                const b = benchLatest.get(key(r.task_type, r.model));
                const k = key(r.task_type, r.model);
                return (
                  <div key={k} className="py-2 flex flex-wrap items-center gap-3">
                    <span className="num text-sm w-72 truncate">{r.model}</span>
                    {r.is_leader ? <Badge tone="green">leader</Badge> : <Badge>w {r.weight.toFixed(2)}</Badge>}
                    {b && <span className="text-xs text-fg-faint num">bench {b.score.toFixed(1)} · ${(b.cost_per_run ?? 0).toFixed(5)} · {b.latency_ms ?? "–"} ms · {b.date}</span>}
                    <span className="flex-1" />
                    <Button size="sm" phase="amber" disabled={pending} onClick={() => start(async () => { const out = await testModelAction(r.model); setRes((s) => ({ ...s, [k]: out })); })}>Test</Button>
                    {!r.is_leader && <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const out = await upsertRouteAction(r.task_type, r.model, r.weight, true); setRes((s) => ({ ...s, [k]: out })); router.refresh(); })}>Make leader</Button>}
                    <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const out = await deleteRouteAction(r.task_type, r.model); setRes((s) => ({ ...s, [k]: out })); router.refresh(); })}>✕</Button>
                    {res[k] && <div className="w-full"><Result r={res[k]} /></div>}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <Card className="space-y-3">
        <CardTitle>Add a candidate</CardTitle>
        <div className="grid md:grid-cols-4 gap-2">
          <Input placeholder="task_type (e.g. research)" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} />
          <Input placeholder="provider:model (e.g. anthropic:claude-sonnet-5)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input placeholder="weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <Button phase="green" disabled={pending || !form.task_type || !form.model} onClick={() => start(async () => { const out = await upsertRouteAction(form.task_type.trim(), form.model.trim(), Number(form.weight) || 1, false); setRes((s) => ({ ...s, add: out })); })}>Add</Button>
        </div>
        <Result r={res.add} />
      </Card>
    </section>
  );
}

/* ---------------- Rates ---------------- */
function RatesSection({ data }: { data: AdminData }) {
  const router = useRouter();
  const [res, setRes] = useState<Record<string, R>>({});
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<Record<string, { i: string; o: string }>>({});
  const [form, setForm] = useState({ provider: "", model: "", i: "", o: "", unit: "per_1m_tokens" });
  const k = (p: string, m: string) => `${p}:${m}`;
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Cost rates <span className="text-fg-faint text-base">(USD per 1M tokens, or per call/page)</span></h2>
      <p className="text-sm text-fg-muted">A model with no rate row refuses to run. Update these when a provider changes prices; the daily digest lists any routed model missing a row.</p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-left"><tr><th className="py-2">provider</th><th>model</th><th>input</th><th>output</th><th>unit</th><th>source</th><th></th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.rates.map((r) => {
              const id = k(r.api_provider, r.api_model);
              const e = edits[id] ?? { i: String(r.input_rate), o: String(r.output_rate) };
              return (
                <tr key={id}>
                  <td className="py-2 pr-3">{r.api_provider}</td>
                  <td className="num pr-3">{r.api_model}</td>
                  <td className="pr-2"><Input className="h-9 w-24 num" value={e.i} onChange={(ev) => setEdits({ ...edits, [id]: { ...e, i: ev.target.value } })} /></td>
                  <td className="pr-2"><Input className="h-9 w-24 num" value={e.o} onChange={(ev) => setEdits({ ...edits, [id]: { ...e, o: ev.target.value } })} /></td>
                  <td className="pr-3 text-fg-muted">{r.unit}</td>
                  <td className="pr-3 text-fg-faint">{r.source}</td>
                  <td className="whitespace-nowrap">
                    <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const out = await upsertRateAction(r.api_provider, r.api_model, Number(e.i), Number(e.o), r.unit); setRes((s) => ({ ...s, [id]: out })); router.refresh(); })}>Save</Button>{" "}
                    <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const out = await deleteRateAction(r.api_provider, r.api_model); setRes((s) => ({ ...s, [id]: out })); router.refresh(); })}>✕</Button>
                    {res[id] && <Result r={res[id]} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card className="space-y-3">
        <CardTitle>Add a rate</CardTitle>
        <div className="grid md:grid-cols-6 gap-2">
          <Input placeholder="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <Input placeholder="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input placeholder="input $/1M" value={form.i} onChange={(e) => setForm({ ...form, i: e.target.value })} />
          <Input placeholder="output $/1M" value={form.o} onChange={(e) => setForm({ ...form, o: e.target.value })} />
          <select className="bg-bg-elev border border-line rounded-2 px-3 h-12" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {["per_1m_tokens", "per_call", "per_page", "per_1k_chars"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <Button phase="green" disabled={pending || !form.provider || !form.model} onClick={() => start(async () => { const out = await upsertRateAction(form.provider.trim(), form.model.trim(), Number(form.i) || 0, Number(form.o) || 0, form.unit); setRes((s) => ({ ...s, add: out })); })}>Add</Button>
        </div>
        <Result r={res.add} />
      </Card>
    </section>
  );
}

/* ---------------- Settings ---------------- */
function SettingsSection({ data }: { data: AdminData }) {
  const router = useRouter();
  const [res, setRes] = useState<Record<string, R>>({});
  const [pending, start] = useTransition();
  const [vals, setVals] = useState<Record<string, string>>({});
  const items: Array<[string, string]> = [
    ["markup", "Markup × COGS"], ["platform_fee", "Platform fee (fraction)"], ["margin_floor", "Auto-raise markup below this gross margin"],
    ["fixed_costs_daily_usd", "Fixed costs per day (USD)"], ["free_tier_max_cost_usd", "Free-tier max COGS per task (USD)"],
  ];
  return (
    <section className="space-y-4">
      <h2 className="text-2xl">Pricing</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(([key, label]) => (
          <Card key={key} className="space-y-2">
            <CardTitle>{label}</CardTitle>
            <div className="flex gap-2">
              <Input className="num" value={vals[key] ?? String(data.settings[key] ?? "")} onChange={(e) => setVals({ ...vals, [key]: e.target.value })} />
              <Button size="sm" phase="green" disabled={pending} onClick={() => start(async () => { const out = await saveSettingAction(key, Number(vals[key] ?? data.settings[key])); setRes((s) => ({ ...s, [key]: out })); router.refresh(); })}>Save</Button>
            </div>
            <Result r={res[key]} />
          </Card>
        ))}
      </div>
    </section>
  );
}
