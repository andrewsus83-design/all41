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
        {/* floating dark pill — logo left, menu centered, CTA right */}
        <div className="relative grad-ink text-white rounded-full shadow-lift flex items-center justify-between gap-4 h-14 md:h-16 pl-5 md:pl-7 pr-2 md:pr-2.5">
          <Link href="/" className="font-title text-xl md:text-2xl font-bold tracking-tight text-white shrink-0">
            all41
          </Link>
          <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link href={signedIn ? "/my-apps" : "/login"} className="hidden lg:inline-flex items-center rounded-full px-3.5 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition">
              {signedIn ? "My Apps" : "Sign in"}
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
