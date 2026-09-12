import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("display_name, role, plan, onboarded_at, created_at").eq("id", user!.id).maybeSingle();
  return <ProfileForm email={user?.email ?? ""} displayName={profile?.display_name ?? ""} role={profile?.role ?? ""} plan={profile?.plan ?? "free"} since={profile?.created_at ?? null} />;
}
