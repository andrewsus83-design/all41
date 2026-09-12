"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";

const PRESETS = [5, 10, 25];

export function TopUp() {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function topUp(amountUsd: number) {
    if (!(amountUsd >= 1 && amountUsd <= 500)) { setErr("Enter an amount between $1 and $500."); return; }
    setBusy(amountUsd);
    setErr(null);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountUsd }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? (r.status === 404 ? "Checkout isn’t wired up yet." : `Checkout failed (HTTP ${r.status}).`));
      }
      const { url } = await r.json();
      if (!url) throw new Error("No checkout URL returned.");
      window.location.assign(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-5">
      <div><CardTitle className="text-xl">Top up</CardTitle><CardHint>Card via Stripe. Credit lands instantly after payment.</CardHint></div>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((a) => (
          <Button key={a} phase="green" size="lg" disabled={busy !== null} onClick={() => topUp(a)}>{busy === a ? "…" : `$${a}`}</Button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); topUp(Number(custom)); }} className="flex gap-3 max-w-xs">
        <Input type="number" min={1} max={500} step={1} placeholder="Custom $" value={custom} onChange={(e) => setCustom(e.target.value)} className="num" />
        <Button type="submit" phase="ghost" disabled={busy !== null || !custom}>Top up</Button>
      </form>
      {err && <p className="text-sm text-red">{err}</p>}
    </Card>
  );
}
