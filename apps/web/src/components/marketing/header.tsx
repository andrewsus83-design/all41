import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NAV } from "./nav-links";
import { MobileNav } from "./mobile-nav";

async function isSignedIn() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export async function MarketingHeader() {
  const signedIn = await isSignedIn();
  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="relative w-full max-w-6xl mx-auto px-6 h-18 flex items-center justify-between gap-6">
        <Link href="/" className="font-title text-2xl font-semibold tracking-tight text-fg">
          all41
        </Link>
        {/* menu + CTA together on the right */}
        <div className="flex items-center gap-2 md:gap-3">
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href={signedIn ? "/my-apps" : "/login"} className="hidden md:block ml-1">
            <Button phase="warm" size="sm" className="glow-coral">{signedIn ? "My Apps" : "Get Started"}</Button>
          </Link>
          <MobileNav signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
