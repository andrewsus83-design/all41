import Link from "next/link";
import { NewsletterPlaceholder } from "./newsletter-placeholder";

type Col = { title: string; links: { href: string; label: string }[] };

const COLUMNS: Col[] = [
  {
    title: "Tools",
    links: [
      { href: "/apps/seo-geo-optimizer", label: "SEO + GEO" },
      { href: "/apps/proposal-rfp-maker", label: "Proposal / RFP" },
      { href: "/apps/advanced-research", label: "Research" },
      { href: "/apps", label: "All tools →" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/solutions", label: "Solutions" },
      { href: "/news", label: "Build in public" },
      { href: "/benchmark", label: "Benchmark" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/resources", label: "Resources" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="w-full max-w-6xl mx-auto px-6 py-14 grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr_0.8fr]">
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="all41" className="h-10 w-auto" />
          <p className="text-fg-muted max-w-xs">The AI does the work. You keep the result.</p>
          <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">Build-in-public updates</p>
            <NewsletterPlaceholder />
          </div>
          <p className="text-sm text-fg-faint pt-1">Built in public.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-fg-faint">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-fg-muted hover:text-fg transition">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
