"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string; created_at: string };

export function SecurityClient() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ a: "", b: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(((data?.all ?? []) as Factor[]));
  }, [supabase]);
  useEffect(() => {
    let alive = true;
    supabase.auth.mfa.listFactors().then(({ data }) => { if (alive) setFactors(((data?.all ?? []) as Factor[])); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `all41 ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return setMsg({ tone: "red", text: error?.message ?? "Enroll failed" });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnroll() {
    if (!enroll) return;
    setBusy(true); setMsg(null);
    const ch = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (ch.error) { setBusy(false); return setMsg({ tone: "red", text: ch.error.message }); }
    const v = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.data.id, code: code.trim() });
    setBusy(false);
    if (v.error) return setMsg({ tone: "red", text: v.error.message });
    setEnroll(null); setCode("");
    setMsg({ tone: "green", text: "Two-factor authentication is on." });
    await load();
  }

  async function unenroll(id: string) {
    if (!confirm("Remove this authenticator?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return setMsg({ tone: "red", text: error.message });
    setMsg({ tone: "green", text: "Authenticator removed." });
    await load();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) return setMsg({ tone: "red", text: "Password must be 8+ characters." });
    if (pw.a !== pw.b) return setMsg({ tone: "red", text: "Passwords don’t match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    setBusy(false);
    if (error) return setMsg({ tone: "red", text: error.message });
    setPw({ a: "", b: "" });
    setMsg({ tone: "green", text: "Password updated." });
  }

  return (
    <div className="space-y-6">
      {msg && <p className={msg.tone === "green" ? "text-green" : "text-red"}>{msg.text}</p>}
      <Card className="space-y-5">
        <div><CardTitle className="text-xl">Two-factor authentication</CardTitle><CardHint>Authenticator app (TOTP). Your credit is money — protect it.</CardHint></div>
        {factors.length > 0 && (
          <ul className="space-y-2">
            {factors.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 squircle rounded-2 bg-bg-elev-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge tone={f.status === "verified" ? "green" : "amber"}>{f.status}</Badge>
                  <span>{f.friendly_name ?? f.factor_type}</span>
                  <span className="num text-xs text-fg-faint">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <Button size="sm" phase="ghost" disabled={busy} onClick={() => unenroll(f.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
        {!enroll ? (
          <Button phase="amber" size="sm" disabled={busy} onClick={startEnroll}>Add authenticator</Button>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-6 items-start flex-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="TOTP QR code" className="size-44 rounded-2 bg-white p-2" />
              <div className="space-y-2 text-sm">
                <p className="text-fg-muted">Scan with your authenticator app, or enter the secret:</p>
                <p className="num break-all text-xs bg-bg-elev-2 rounded-1 px-3 py-2">{enroll.secret}</p>
                <div className="flex gap-2">
                  <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="num w-40" inputMode="numeric" />
                  <Button phase="green" disabled={busy || code.trim().length < 6} onClick={verifyEnroll}>Verify</Button>
                  <Button phase="ghost" disabled={busy} onClick={async () => { await supabase.auth.mfa.unenroll({ factorId: enroll.id }); setEnroll(null); }}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-5">
        <div><CardTitle className="text-xl">Change password</CardTitle></div>
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          <Input type="password" placeholder="New password (8+ chars)" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" />
          <Input type="password" placeholder="Repeat new password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" />
          <Button type="submit" phase="green" size="sm" disabled={busy || !pw.a}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
