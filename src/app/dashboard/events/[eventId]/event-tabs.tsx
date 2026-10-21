"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", path: "" },
  { label: "Guests", path: "/guests" },
  { label: "Settings", path: "/settings" },
] as const;

/** The sections of one event. Highlights the one the person is on. */
export function EventTabs({ base }: { base: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Event sections" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map((tab) => {
          const href = `${base}${tab.path}`;
          const active = tab.path === "" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={tab.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors ${
                  active ? "border-gold text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
