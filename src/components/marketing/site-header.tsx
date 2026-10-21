import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { CONTACT_EMAIL } from "@/lib/site";

const navLink = "rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-fg";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className={`${navLink} hidden sm:inline-block`}>
            How it works
          </a>
          <a href="#pricing" className={`${navLink} hidden sm:inline-block`}>
            Pricing
          </a>
          <Link href="/login" className={navLink}>
            Sign in
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className={buttonStyles()}>
            Talk to us
          </a>
        </nav>
      </div>
    </header>
  );
}
