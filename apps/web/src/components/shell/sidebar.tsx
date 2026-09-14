"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/home", label: "Home", hint: "Your world" },
  { href: "/chat", label: "Chat", hint: "Tell the AI what you need" },
] as const;

/** A "left panel" glyph — a framed panel with a divided-off left column. */
function PanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // SSR-safe read of the persisted preference (localStorage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setCollapsed(localStorage.getItem("all41-sidebar") === "1"); } catch { /* private mode */ }
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("all41-sidebar", next ? "1" : "0"); } catch { /* private mode */ }
      return next;
    });

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Show menu"
        title="Show menu"
        className="fixed top-4 left-4 z-50 size-10 rounded-2 border border-line bg-bg-elev grid place-items-center text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition shadow-lift"
      >
        <PanelIcon />
      </button>
    );
  }

  const items = [...NAV, ...(isAdmin ? [{ href: "/admin", label: "Admin", hint: "Apps · APIs · members · ops" } as const] : [])];

  return (
    <aside className="w-60 shrink-0 border-r border-line flex flex-col p-6 gap-8 min-h-screen sticky top-0">
      <div className="flex items-center justify-between gap-2">
        <Link href="/home" className="font-title text-2xl font-semibold tracking-tight">all41</Link>
        <button type="button" onClick={toggle} aria-label="Hide menu" title="Hide menu" className="size-8 rounded-2 grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev transition">
          <PanelIcon />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "squircle rounded-2 px-4 py-3 transition flex flex-col",
                active ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg hover:bg-bg-elev",
              )}
            >
              <span className="font-title font-medium">{n.label}</span>
              <span className="text-xs text-fg-faint">{n.hint}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <Link href="/settings" className={cn("squircle rounded-2 px-4 py-2 transition flex items-center gap-2 text-sm", pathname.startsWith("/settings") ? "bg-bg-elev-2 text-fg" : "text-fg-faint hover:text-fg hover:bg-bg-elev")}>
          Settings <span className="text-xs text-fg-faint">· billing · account</span>
        </Link>
        <p className="reflect text-fg-faint text-base">AI rewards you for thinking clearly.</p>
      </div>
    </aside>
  );
}
