"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { NAV } from "./nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="h-11 w-11 rounded-full border border-white/25 grid place-items-center text-white"
      >
        <span className="relative block w-5 h-3" aria-hidden>
          <span className={cn("absolute left-0 top-0 h-0.5 w-5 bg-current transition", open && "top-1.5 rotate-45")} />
          <span className={cn("absolute left-0 top-1.5 h-0.5 w-5 bg-current transition", open && "opacity-0")} />
          <span className={cn("absolute left-0 top-3 h-0.5 w-5 bg-current transition", open && "top-1.5 -rotate-45")} />
        </span>
      </button>
      <div id="mobile-menu" hidden={!open} className="absolute inset-x-0 top-full border-b border-line bg-bg/95 backdrop-blur px-6 py-6">
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("squircle rounded-2 px-4 py-3 font-title text-lg", pathname === n.href ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          <Link href={signedIn ? "/my-apps" : "/login"} onClick={() => setOpen(false)} className="block">
            <Button phase="warm" className="w-full">{signedIn ? "My Apps" : "Get Started"}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
