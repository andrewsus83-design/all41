"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { RsvpRecord } from "@/lib/guest/records";
import { RsvpForm } from "./rsvp-form";

/**
 * "Change my answer", folded away until the guest wants it. A native <details>, so it opens
 * without JavaScript too. It closes itself once a new answer is saved.
 */
export function ChangeAnswer({ token, existing }: { token: string; existing: RsvpRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="group rounded-[2rem] border border-line bg-panel">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
        Change my answer
        <ChevronDown className="size-5 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-6 pt-2 pb-6">
        <RsvpForm token={token} existing={existing} submitLabel="Update my answer" onSaved={() => setOpen(false)} />
      </div>
    </details>
  );
}
