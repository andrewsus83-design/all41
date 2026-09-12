import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/finance";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar email={user.email ?? ""} balance={balance} />
        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
