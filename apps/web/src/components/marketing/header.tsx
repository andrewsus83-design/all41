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
      <div className="mx-auto w-full sm:w-[82%] max-w-[1400px]">
        {/* floating cream pill — logo left, menu centered, CTA right */}
        <div className="relative bg-bg-elev-2 border border-line text-fg rounded-full shadow-lift flex items-center gap-3 h-14 md:h-16 pl-5 md:pl-7 pr-8">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="shrink-0" aria-label="all41 home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="all41" className="h-8 md:h-9 w-auto" />
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
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M20 2 H80 A18 18 0 0 1 80 38 H20 A18 18 0 0 1 20 2 Z"
                  pathLength={100}
                  fill="none"
                  strokeWidth={2.5}
                  className="draw-outline"
                  style={{ stroke: "#f4642a", filter: "drop-shadow(0 0 4px #f4642a)" }}
                />
              </svg>
              <span className="relative">{signedIn ? "My Apps" : "Sign in"}</span>
            </Link>
            <Link href={signedIn ? "/build" : "/login"} className="hidden lg:block">
              <Button phase="warm" size="sm" className="glow-coral">Get Started</Button>
            </Link>
            <MobileNav signedIn={signedIn} />
          </div>
        </div>
      </div>
    </header>
  );
}
