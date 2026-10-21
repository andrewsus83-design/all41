"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveAllPending } from "./actions";

/** Approves every waiting photo after one confirmation. */
export function ApproveAllButton({ eventId, count }: { eventId: string; count: number }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, startWorking] = useTransition();

  const run = () => {
    setError(undefined);
    startWorking(async () => {
      const result = await approveAllPending(eventId);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-muted">
            Put all {count.toLocaleString("en-US")} waiting {count === 1 ? "photo" : "photos"} on the wall?
          </span>
          <Button variant="neon" onClick={run} disabled={busy}>
            {busy ? "Approving…" : "Approve all"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Approve all waiting
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
