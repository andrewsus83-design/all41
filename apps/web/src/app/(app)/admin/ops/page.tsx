import { RoutingSection, RatesSection, SettingsSection } from "../admin-client";
import { loadAdminData } from "../load";

export const metadata = { title: "Platform Ops · Admin" };
export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const data = await loadAdminData();
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-medium">Platform Ops</h2>
        <p className="text-sm text-fg-muted">The LLM router (leader per task, rewritten by the daily blind benchmark), cost rates per model, and the pricing knobs. Direct first-party providers only.</p>
      </div>
      <RoutingSection data={data} />
      <RatesSection data={data} />
      <SettingsSection data={data} />
    </div>
  );
}
