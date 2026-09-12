"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Honest placeholder: stores nothing, sends nothing. */
export function NewsletterPlaceholder() {
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" disabled={done} />
      <Button type="submit" phase="ghost" disabled={done} className="shrink-0">{done ? "Noted" : "Keep me posted"}</Button>
      {done ? <p className="sm:basis-full text-sm text-amber">Newsletter coming soon — nothing was stored. Follow the updates below for now.</p> : null}
    </form>
  );
}
