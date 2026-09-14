import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/finance";
import { Money } from "@/components/ui/money";
import { BottomNav } from "@/components/shell/bottom-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, balance] = await Promise.all([
    supabase.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle(),
    getBalance(user.id).catch(() => 0),
  ]);
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      {/* minimal credit chip — the only persistent top chrome */}
      <div className="fixed top-4 right-5 z-40">
        <Link href="/settings/billing" className="squircle rounded-full border border-line bg-bg-elev/90 backdrop-blur px-4 py-1.5 flex items-center gap-2 text-sm hover:bg-bg-elev-2 transition shadow-sm">
          <span className="text-fg-faint">Credit</span>
          <Money usd={balance} className="text-fg" />
        </Link>
      </div>

      <main className="p-5 md:p-10 pb-28 min-h-screen">{children}</main>

      <BottomNav />
    </div>
  );
}
