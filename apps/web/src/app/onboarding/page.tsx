import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./onboarding-client";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle();
  if (profile?.onboarded_at) redirect("/home");
  return (
    <main className="min-h-screen p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="space-y-3">
          <div className="font-title text-2xl font-semibold">all41</div>
          <h1 className="text-5xl font-semibold leading-tight">One question, then a finished deliverable.</h1>
          <p className="reflect text-fg-muted">What do you do?</p>
        </div>
        <OnboardingClient />
      </div>
    </main>
  );
}
