"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { FaqItem } from "@/content/faq";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <div key={it.id}>
            <h3>
              <button
                type="button"
                id={`faq-${it.id}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${it.id}`}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className="w-full flex items-center justify-between gap-6 py-6 text-left font-title text-lg md:text-xl font-medium hover:text-fg text-fg"
              >
                <span>{it.q}</span>
                <span className={cn("shrink-0 text-fg-faint transition-transform", isOpen && "rotate-45")} aria-hidden>+</span>
              </button>
            </h3>
            <div id={`faq-panel-${it.id}`} role="region" aria-labelledby={`faq-${it.id}`} hidden={!isOpen} className="pb-6 -mt-2">
              <p className="text-fg-muted leading-relaxed max-w-3xl">{it.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
