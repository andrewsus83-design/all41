import { adminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Organizations · Admin" };
export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const db = adminClient();
  const [{ data: orgs }, { data: members }] = await Promise.all([
    db.from("organizations").select("id,name,plan,owner_id,created_at").order("created_at", { ascending: false }).limit(500),
    db.from("org_members").select("org_id,role"),
  ]);
  const countByOrg = new Map<string, number>();
  for (const m of members ?? []) countByOrg.set(m.org_id, (countByOrg.get(m.org_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-medium">Organizations & teams</h2>
          <p className="text-sm text-fg-muted max-w-2xl">Every user has a personal workspace; teams add members with roles (owner / admin / member). An org is the scope for apps, data and billing — the multi-tenant foundation (each run stamps its <span className="num">account_id</span>).</p>
        </div>
        <p className="text-sm text-fg-muted num"><span className="text-2xl font-semibold text-fg">{orgs?.length ?? 0}</span> orgs</p>
      </div>

      <div className="overflow-x-auto squircle rounded-4 border border-line">
        <table className="w-full text-sm border-collapse">
          <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
            <tr>
              <th className="text-left font-medium py-3 px-4">Organization</th>
              <th className="text-left font-medium py-3 px-4">Plan</th>
              <th className="text-left font-medium py-3 px-4">Members</th>
              <th className="text-left font-medium py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {(orgs ?? []).map((o) => (
              <tr key={o.id} className="border-t border-line bg-bg-elev">
                <td className="py-3 px-4 font-medium">{o.name}</td>
                <td className="py-3 px-4">{o.plan === "team" ? <Badge tone="violet">team</Badge> : <Badge>payg</Badge>}</td>
                <td className="py-3 px-4 num text-fg-muted">{countByOrg.get(o.id) ?? 0}</td>
                <td className="py-3 px-4 num text-xs text-fg-faint">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-fg-faint">Next slice: the user-facing “Create team · invite members · switch org” flow (in Settings), plus org-scoped billing and app sharing.</p>
    </div>
  );
}
