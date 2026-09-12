"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pauseInstance, resumeInstance, runInstanceNow, deleteInstance } from "./actions";

export function InstanceControls({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      setMsg(null);
      const r = (await fn()) as { ok?: boolean; error?: string; taskId?: string } | undefined;
      if (r && r.ok === false) setMsg(r.error ?? "Failed");
      if (r && r.ok && r.taskId) setMsg("Run done — see Chat.");
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" phase="green" disabled={pending} onClick={() => act(() => runInstanceNow(id))}>{pending ? "…" : "Run now"}</Button>
      {status === "paused" ? (
        <Button size="sm" phase="ghost" disabled={pending} onClick={() => act(() => resumeInstance(id))}>Resume</Button>
      ) : status === "active" ? (
        <Button size="sm" phase="ghost" disabled={pending} onClick={() => act(() => pauseInstance(id))}>Pause</Button>
      ) : null}
      <Button size="sm" phase="ghost" className="text-red border-red/30" disabled={pending} onClick={() => { if (confirm("Delete this app instance?")) act(() => deleteInstance(id)); }}>Delete</Button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </div>
  );
}
