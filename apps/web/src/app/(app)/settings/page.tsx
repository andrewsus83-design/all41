import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/ui/money";
import { getBalance } from "@/lib/finance";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/settings/billing", label: "Billing & credits", hint: "Top up, usage and receipts", icon: "💳" },
  { href: "/settings/security", label: "Security", hint: "Sign-in, sessions and password", icon: "🔒" },
  { href: "/settings/privacy", label: "Privacy Policy", hint: "How your data is handled", icon: "🛡️" },
  { href: "/settings/terms", label: "Terms of Use", hint: "The agreement you use all41 under", icon: "📄" },
  { href: "/settings/help", label: "Help & support", hint: "Guides and getting in touch", icon: "🆘" },
] as const;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, balance] = await Promise.all([
    supabase.from("profiles").select("display_name, role, plan, onboarded_at, created_at").eq("id", user!.id).maybeSingle(),
    getBalance(user!.id).catch(() => 0),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="text-fg-muted">Your account, billing and the legal bits — all in one place.</p>
      </header>

      {/* credit at a glance */}
      <Link href="/settings/billing" className="squircle rounded-4 border border-line bg-bg-elev p-5 flex items-center justify-between gap-4 hover:bg-bg-elev-2 transition">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-faint">Credit balance</p>
          <Money usd={balance} className="text-3xl" />
        </div>
        <span className="squircle rounded-full bg-green-soft text-green px-4 py-2 text-sm font-medium">Top up →</span>
      </Link>

      {/* profile / account */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Account</h2>
        <ProfileForm email={user?.email ?? ""} displayName={profile?.display_name ?? ""} role={profile?.role ?? ""} plan={profile?.plan ?? "free"} since={profile?.created_at ?? null} />
      </section>

      {/* every section */}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Everything else</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="squircle rounded-3 border border-line bg-bg-elev p-4 flex items-start gap-3 hover:border-line-strong hover:bg-bg-elev-2 transition">
              <span className="text-2xl leading-none">{s.icon}</span>
              <div className="min-w-0">
                <p className="font-title font-medium">{s.label}</p>
                <p className="text-sm text-fg-muted">{s.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* sign out */}
      <section className="pt-2 border-t border-line">
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-red hover:underline">Sign out</button>
        </form>
      </section>
    </div>
  );
}
