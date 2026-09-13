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
        <div className="relative grad-nav text-white rounded-full shadow-lift flex items-center gap-3 h-14 md:h-16 pl-5 md:pl-7 pr-2 md:pr-2.5">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="font-title text-xl md:text-2xl font-bold tracking-tight text-white shrink-0">
              all41
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-0.5 shrink-0" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-white/85 hover:text-white hover:bg-white/15 transition">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1 flex items-center justify-end gap-1.5">
            <Link href={signedIn ? "/my-apps" : "/login"} className="hidden lg:inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-sm text-white/85 hover:text-white hover:bg-white/15 transition">
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
