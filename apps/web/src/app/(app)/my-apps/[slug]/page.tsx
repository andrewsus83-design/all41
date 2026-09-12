import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Money } from "@/components/ui/money";
import { ConfigureClient, type ConfigQuestion } from "./configure-client";

export default async function AppConfigurePage(props: PageProps<"/my-apps/[slug]">) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const { data: app } = await supabase.from("mini_apps").select("slug, name, description, icon, est_credit_cost, config_schema").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!app) notFound();
  const questions = (Array.isArray(app.config_schema) ? app.config_schema : []) as ConfigQuestion[];
  return (
    <div className="max-w-3xl space-y-10">
      <Link href="/my-apps" className="text-sm text-fg-muted hover:text-fg">← Apps</Link>
      <header className="flex items-center gap-5">
        <span className="text-5xl">{app.icon ?? "◻"}</span>
        <div className="space-y-1">
          <h1 className="text-4xl font-semibold">{app.name}</h1>
          <p className="text-fg-muted">{app.description}</p>
          <p className="text-sm text-fg-faint">≈ <Money usd={Number(app.est_credit_cost)} /> per run · pay only when it runs</p>
        </div>
      </header>
      <ConfigureClient slug={app.slug} appName={app.name} questions={questions} />
    </div>
  );
}
