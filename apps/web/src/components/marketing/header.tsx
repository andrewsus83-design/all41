import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NAV } from "./nav-links";
import { MobileNav } from "./mobile-nav";

async function isSignedIn() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export async function MarketingHeader() {
  const signedIn = await isSignedIn();
  return (
    <header className="sticky top-3 md:top-5 z-40 px-4 sm:px-0">
      <div className="mx-auto w-full sm:w-[82%] max-w-[1400px] flex items-center gap-4 lg:gap-16">
        {/* floating cream pill — logo left, menu centered, sign-in right */}
        <div className="relative flex-1 bg-bg-elev-2 border border-line text-fg rounded-full shadow-lift flex items-center gap-3 h-14 md:h-16 pl-5 md:pl-7 pr-3 md:pr-5">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="font-title text-xl md:text-2xl font-bold tracking-tight text-fg shrink-0">
              all41
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-0.5 shrink-0" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-base text-fg-muted hover:text-fg hover:bg-sunken transition">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1 flex items-center justify-end gap-1.5">
            <Link
              href={signedIn ? "/my-apps" : "/login"}
              className="group relative hidden lg:inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-base font-medium text-fg-muted hover:text-fg transition"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full border border-line-strong transition group-hover:border-transparent" aria-hidden />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden
              >
                <rect x="1" y="1" width="98" height="38" rx="19" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="dash-run" />
              </svg>
              <span className="relative">{signedIn ? "My Apps" : "Sign in"}</span>
            </Link>
            <MobileNav signedIn={signedIn} />
          </div>
        </div>
        <Link href={signedIn ? "/build" : "/login"} className="hidden lg:block shrink-0">
          <Button phase="warm" size="lg" className="glow-coral">Get Started</Button>
        </Link>
      </div>
    </header>
  );
}
