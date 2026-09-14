import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Sticky top bar for an app landing — Back on the left, the primary CTA on the right.
 * Full-bleed (cancels the (app) layout's p-5/md:p-10 padding) and sits just under the
 * shell's floating Credit chip (fixed top-4 right-5 z-40); the right padding keeps the
 * CTA clear of that chip so it lands immediately to its left. On narrow screens the CTA
 * shows a shorter label so it still fits beside the (fixed-width) Credit chip. */
export function LandingTopBar({ backHref = "/chat", backLabel = "Studio", ctaHref, ctaLabel, ctaShort }: { backHref?: string; backLabel?: string; ctaHref: string; ctaLabel: string; ctaShort?: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-5 md:-mx-10 -mt-5 md:-mt-10 mb-6 md:mb-8 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="h-16 flex items-center justify-between gap-2 pl-5 md:pl-8 pr-40 sm:pr-44">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition whitespace-nowrap shrink-0">← {backLabel}</Link>
        <Link href={ctaHref} className="shrink-0">
          <Button phase="green" size="sm" className="whitespace-nowrap">
            {ctaShort ? <><span className="sm:hidden">{ctaShort}</span><span className="hidden sm:inline">{ctaLabel}</span></> : ctaLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
