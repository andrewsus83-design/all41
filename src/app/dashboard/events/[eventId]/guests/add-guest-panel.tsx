"use client";

import { useState, type ReactNode } from "react";

/** The "Add a guest" drawer. It starts open on an empty list and then stays as the person left it, so adding the first guest does not fold it away. */
export function AddGuestPanel({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="group rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
        Add a guest
        <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-line px-6 py-5">{children}</div>
    </details>
  );
}
