"use client";

import { ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { buttonStyles, Button } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/form";
import { regenerateWallKey } from "./actions";
import { CopyButton } from "./copy-button";

/** The address of the venue screen, to copy or open, and the way to replace it if it got out. */
export function WallLink({ eventId, address, canEdit }: { eventId: string; address: string; canEdit: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [replacing, startReplacing] = useTransition();

  const replace = () => {
    setError(undefined);
    startReplacing(async () => {
      const result = await regenerateWallKey(eventId);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label htmlFor="wall-address" className="sr-only">
            Address of the wall
          </label>
          <input
            id="wall-address"
            readOnly
            value={address}
            onFocus={(event) => event.currentTarget.select()}
            className={`${controlStyles()} h-11 text-sm`}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <CopyButton value={address} label="Copy the wall address" />
          <a href={address} target="_blank" rel="noreferrer" className={`${buttonStyles({ variant: "neon" })} shrink-0`}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open
          </a>
        </div>
      </div>
      <p className="text-sm text-muted">
        Open this address on the venue screen. Anyone with the address can see the wall, so share it only with the people who run the screens.
      </p>

      {canEdit &&
        (confirming ? (
          <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger/10 p-4">
            <p className="text-sm">The old address stops working at once. Every screen that shows the wall needs the new one.</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={replace} disabled={replacing}>
                {replacing ? "Replacing…" : "Make a new address"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={replacing}>
                Keep the old one
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="-ml-3" onClick={() => setConfirming(true)}>
            Make a new address
          </Button>
        ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
