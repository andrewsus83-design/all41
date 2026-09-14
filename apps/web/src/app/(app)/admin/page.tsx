import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, CardHint } from "@/components/ui/card";

export const metadata = { title: "Overview · Admin" };
export const dynamic = "force-dynamic";

async function count(table: string, published?: boolean): Promise<number> {
  const db = adminClient();
  let q = db.from(table as "mini_apps").select("*", { count: "exact", head: true });
  if (published !== undefined) q = q.eq("is_published", published);
  const { count: n } = await q;
  return n ?? 0;
}

export default async function AdminOverview() {
  const db = adminClient();
  const [apps, published, members, orgs, tasks] = await Promise.all([
    count("mini_apps"),
    count("mini_apps", true),
    count("profiles"),
    count("organizations"),
    count("tasks"),
  ]);
  const { data: audit } = await db.from("admin_audit_log").select("action,target,created_at").order("created_at", { ascending: false }).limit(8);

  const stats = [
    { label: "Apps", value: apps, sub: `${published} published`, href: "/admin/apps" },
    { label: "Members", value: members, sub: "users", href: "/admin/members" },
    { label: "Organizations", value: orgs, sub: "teams", href: "/admin/organizations" },
    { label: "Runs", value: tasks, sub: "all-time tasks", href: "/admin/payment" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="squircle rounded-4 border border-line bg-bg-elev p-6 hover:bg-bg-elev-2 transition">
            <p className="text-4xl font-semibold num">{s.value}</p>
            <p className="font-title font-medium mt-1">{s.label}</p>
            <p className="text-xs text-fg-faint">{s.sub}</p>
          </Link>
        ))}
      </div>

      <Card className="space-y-3">
        <CardTitle>Recent admin activity</CardTitle>
        {(audit ?? []).length === 0 ? (
          <CardHint>No admin actions logged yet.</CardHint>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {(audit ?? []).map((a, i) => (
              <li key={i} className="py-2 flex items-center gap-3">
                <span className="num text-fg">{a.action}</span>
                {a.target && <span className="text-fg-muted truncate">{a.target}</span>}
                <span className="flex-1" />
                <span className="text-xs text-fg-faint num">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
