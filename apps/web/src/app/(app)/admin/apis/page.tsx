import { KeysSection } from "../admin-client";
import { loadAdminData } from "../load";

export const metadata = { title: "APIs · Admin" };
export const dynamic = "force-dynamic";

export default async function ApisPage() {
  const data = await loadAdminData();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">APIs & keys</h2>
        <p className="text-sm text-fg-muted">All provider keys the platform needs — LLMs, data sources, and infra (Stripe, Inngest, alerts). Encrypted in Supabase Vault, never sent to the client.</p>
      </div>
      <KeysSection data={data} />
    </div>
  );
}
