import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CONTACT_EMAIL, TAGLINE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted">{TAGLINE}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#pricing" className="hover:text-fg">
            Pricing
          </a>
          <Link href="/login" className="hover:text-fg">
            Sign in
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-fg">
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}
