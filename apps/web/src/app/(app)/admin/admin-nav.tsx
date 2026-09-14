"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { href: "/admin", label: "Overview", hint: "Health at a glance", exact: true },
  { href: "/admin/apps", label: "Apps", hint: "Schema · build · versions", exact: false },
  { href: "/admin/apis", label: "APIs", hint: "Provider keys · Vault", exact: false },
  { href: "/admin/members", label: "Members", hint: "Users · credits · roles", exact: false },
  { href: "/admin/organizations", label: "Organizations", hint: "Teams · invites", exact: false },
  { href: "/admin/payment", label: "Payment", hint: "Credits · transactions", exact: false },
  { href: "/admin/inbox", label: "Inbox", hint: "Email in & out", exact: false },
  { href: "/admin/graph", label: "Graph", hint: "Obsidian-style memory", exact: false },
  { href: "/admin/services", label: "Services", hint: "LLM · data · jobs health", exact: false },
  { href: "/admin/ops", label: "Platform Ops", hint: "Routing · rates · pricing", exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 flex-wrap border-b border-line pb-3 mb-8">
      {SECTIONS.map((s) => {
        const active = s.exact ? pathname === s.href : pathname === s.href || pathname.startsWith(s.href + "/");
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "squircle rounded-2 px-3.5 py-2 transition flex flex-col leading-tight",
              active ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg hover:bg-bg-elev",
            )}
          >
            <span className="font-title font-medium text-sm">{s.label}</span>
            <span className="text-[11px] text-fg-faint">{s.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
