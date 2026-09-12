import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /my-apps/[slug] — an instance id opens that app in My Apps; a template slug (the marketing site links these)
 * opens Build with it preselected.
 */
export default async function MyAppRedirect(props: PageProps<"/my-apps/[slug]">) {
  const { slug } = await props.params;
  if (UUID.test(slug)) {
    const supabase = await createClient();
    const { data } = await supabase.from("user_app_instances").select("id").eq("id", slug).maybeSingle();
    if (data) redirect(`/my-apps?id=${data.id}`);
  }
  const { data: app } = await adminClient().from("mini_apps").select("slug, is_published").eq("slug", slug).maybeSingle();
  if (app && (app.is_published || app.slug === "custom")) redirect(`/build?app=${app.slug}`);
  notFound();
}
