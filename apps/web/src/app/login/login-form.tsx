"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Mode = "signin" | "signup" | "magic";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/chat";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(params.get("error") ? "Sign-in link failed. Try again." : null);
  const [busy, setBusy] = useState(false);

  // lightweight device fingerprint for free-credit anti-abuse (Task 1.6)
  useEffect(() => {
    try {
      const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join("|");
      let h = 2166136261;
      for (let i = 0; i < raw.length; i++) h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
      document.cookie = `a41_fp=${(h >>> 0).toString(16)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callback = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(next);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
        if (error) throw error;
        setMsg("Check your email to confirm — your $2 welcome credit unlocks after verification.");
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback } });
        if (error) throw error;
        setMsg("Magic link sent. Check your inbox.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback } });
  }

  return (
    <Card className="space-y-6">
      <div className="flex gap-2 text-sm">
        {(["signin", "signup", "magic"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 h-9 rounded-1 ${mode === m ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg"}`}
          >
            {m === "signin" ? "Sign in" : m === "signup" ? "Create account" : "Magic link"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {mode !== "magic" && (
          <Input type="password" required minLength={8} placeholder="Password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        )}
        <Button type="submit" phase="green" className="w-full" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account · get $2 free" : "Send magic link"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-fg-faint"><span className="flex-1 h-px bg-line" />or<span className="flex-1 h-px bg-line" /></div>
      <Button type="button" phase="ghost" className="w-full" onClick={google}>Continue with Google</Button>
      {msg && <p className="text-sm text-amber">{msg}</p>}
      <p className="text-xs text-fg-faint">No API keys. No subscriptions. You top up credit and pay only for what runs.</p>
    </Card>
  );
}
