"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "./actions";

export function ProfileForm({ email, displayName, role, plan, since }: { email: string; displayName: string; role: string; plan: string; since: string | null }) {
  const [state, action, pending] = useActionState(async (_prev: { ok: boolean; error?: string } | null, fd: FormData) => updateProfile(fd), null);
  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl">Profile</CardTitle>
        <Badge tone="green">{plan}</Badge>
      </div>
      <form action={action} className="space-y-4 max-w-md">
        <div className="space-y-1"><label className="text-xs uppercase tracking-wide text-fg-faint">Email</label><Input value={email} readOnly className="opacity-60" /></div>
        <div className="space-y-1"><label className="text-xs uppercase tracking-wide text-fg-faint">Display name</label><Input name="display_name" defaultValue={displayName} placeholder="How should we address you?" /></div>
        <div className="space-y-1"><label className="text-xs uppercase tracking-wide text-fg-faint">What you do</label><Input name="role" defaultValue={role} placeholder="Founder · Consultant · Agency owner…" /></div>
        <div className="flex items-center gap-4">
          <Button type="submit" phase="green" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          {state?.ok && <span className="text-sm text-green">Saved.</span>}
          {state && !state.ok && <span className="text-sm text-red">{state.error}</span>}
        </div>
      </form>
      {since && <CardHint>Member since <span className="num">{new Date(since).toLocaleDateString()}</span></CardHint>}
    </Card>
  );
}
