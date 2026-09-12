"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/help", label: "Help" },
  { href: "/settings/terms", label: "Terms and Conditions" },
  { href: "/settings/privacy", label: "Privacy Policy" },
];

export function SettingsNav() {
  const p = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={cn("squircle h-10 px-5 inline-flex items-center rounded-2 text-sm font-title transition", p === t.href ? "bg-bg-elev-2 text-fg" : "text-fg-muted hover:text-fg hover:bg-bg-elev")}>{t.label}</Link>
      ))}
    </nav>
  );
}
