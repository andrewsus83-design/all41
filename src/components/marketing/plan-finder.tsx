"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  EXTRA_GUEST_BLOCK_SIZE,
  MAX_SELF_SERVICE_GUESTS,
  cheapestPlan,
  formatIdr,
  getPackage,
} from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";

const MAX_DIGITS = 6;

function parseGuests(raw: string): number | null {
  const digits = raw.trim();
  if (!/^\d+$/.test(digits) || digits.length > MAX_DIGITS) return null;
  const guests = Number(digits);
  return guests >= 1 ? guests : null;
}

function Result({ guests }: { guests: number | null }) {
  if (guests === null) {
    return <p className="text-muted">Enter a whole number of guests, from 1 up.</p>;
  }

  const plan = cheapestPlan(guests);
  if (plan === null) {
    return (
      <p>
        Over {MAX_SELF_SERVICE_GUESTS.toLocaleString("en-US")} guests is quoted by hand.{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Event%20over%202%2C500%20guests`} className="text-gold underline">
          Talk to us
        </a>
        .
      </p>
    );
  }

  const pkg = getPackage(plan.tier);
  const extraGuests = plan.extraGuestBlocks * EXTRA_GUEST_BLOCK_SIZE;
  return (
    <div className="space-y-1">
      <p className="font-display text-3xl font-semibold tracking-tight">
        {plan.totalIdr === 0 ? "Free" : formatIdr(plan.totalIdr)}
      </p>
      <p className="text-muted">
        {pkg.name} package
        {extraGuests > 0 ? ` plus ${extraGuests.toLocaleString("en-US")} extra guests` : ""}, room for{" "}
        {(pkg.guestCapacity + extraGuests).toLocaleString("en-US")} guests.
      </p>
    </div>
  );
}

export function PlanFinder() {
  const inputId = useId();
  const [raw, setRaw] = useState("300");

  return (
    <Card className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-8">
      <div>
        <label htmlFor={inputId} className="text-sm font-medium">
          How many guests will you invite?
        </label>
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          aria-describedby={`${inputId}-result`}
          className="mt-2 block h-12 w-full rounded-2xl border border-line bg-surface px-5 text-lg tabular-nums outline-none focus:border-gold sm:w-56"
        />
      </div>
      <div id={`${inputId}-result`} aria-live="polite">
        <Result guests={parseGuests(raw)} />
      </div>
    </Card>
  );
}
