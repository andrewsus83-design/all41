"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/chat", label: "Chat", hint: "Brief a task" },
  { href: "/dashboard", label: "Dashboard", hint: "Balance & usage" },
  { href: "/apps", label: "Apps", hint: "Pick → chat → ready" },
  { href: "/models", label: "Models", hint: "Daily benchmark" },
  { href: "/graph", label: "Graph", hint: "Your connected context" },
  { href: "/settings", label: "Settings", hint: "Billing · profile · security" },
] as const;

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-line flex flex-col p-6 gap-8 min-h-screen sticky top-0">
      <Link href="/chat" className="font-title text-2xl font-semibold tracking-tight">
        all41
      </Link>
      <nav className="flex flex-col gap-1">
        {[...NAV, ...(isAdmin ? [{ href: "/admin", label: "Admin", hint: "Keys · routing · pricing" }] : [])].map((n) => {
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
      <p className="mt-auto reflect text-fg-faint text-base">AI rewards you for thinking clearly.</p>
    </aside>
  );
}
