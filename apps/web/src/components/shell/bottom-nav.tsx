"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";
import { ReportButton } from "./report-button";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}
function DataIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const ITEMS = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/chat", label: "Studio", Icon: CompassIcon },
  { href: "/data", label: "Data", Icon: DataIcon },
  { href: "/settings", label: "Settings", Icon: GearIcon },
] as const;

/** The whole app chrome — a full-width bar stuck to the bottom: logo · 3 icons (center) · theme + report.
 * Hides when scrolling down; reappears when scrolling up or when scrolling stops. */
export function BottomNav() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const idle = useRef<number | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY.current + 4 && y > 48) setHidden(true);   // scrolling down → hide
      else if (y < lastY.current - 4) setHidden(false);        // scrolling up → show
      lastY.current = y;
      if (idle.current) clearTimeout(idle.current);
      idle.current = window.setTimeout(() => setHidden(false), 900); // came to rest → show
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (idle.current) clearTimeout(idle.current); };
  }, []);

  return (
    <nav aria-label="Main" className={cn("fixed bottom-0 inset-x-0 z-50 h-16 border-t border-line bg-bg-elev/95 backdrop-blur transition-transform duration-300", hidden && "translate-y-full")}>
      <div className="relative h-full max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6">
        {/* left: logo */}
        <Link href="/home" className="shrink-0" aria-label="all41 home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="all41" className="h-8 w-auto" />
        </Link>

        {/* center: the 3 icons */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 h-11 rounded-full transition",
                  active ? "bg-fg text-bg pl-3.5 pr-4" : "text-fg-muted hover:text-fg hover:bg-bg-elev-2 w-11 justify-center",
                )}
              >
                <Icon />
                {active && <span className="font-title font-medium text-sm whitespace-nowrap">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* right: theme + report */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <ReportButton />
        </div>
      </div>
    </nav>
  );
}
