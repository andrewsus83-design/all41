import Link from "next/link";
import { NAV } from "./nav-links";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="w-full max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="font-title text-2xl font-semibold">all41</p>
          <p className="text-fg-muted max-w-sm">GEM — Grow in Easy way and Measurable.</p>
          <p className="text-sm text-fg-faint">Built in public.</p>
        </div>
        <nav aria-label="Footer" className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Site</p>
          <ul className="space-y-1.5">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-fg-muted hover:text-fg">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Legal</p>
          <ul className="space-y-1.5">
            <li><Link href="/privacy" className="text-fg-muted hover:text-fg">Privacy</Link></li>
            <li><Link href="/terms" className="text-fg-muted hover:text-fg">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
