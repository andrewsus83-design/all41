import { adminClient } from "@/lib/supabase/admin";
import { MembersTable, type MemberRow } from "./members-table";

export const metadata = { title: "Members · Admin" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const db = adminClient();
  const [{ data: list }, { data: profiles }, { data: ledger }] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
    db.from("profiles").select("id,display_name,plan"),
    db.from("credit_ledger").select("user_id,balance_after,created_at").order("created_at", { ascending: false }).limit(4000),
  ]);

  const profById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const balById = new Map<string, number>();
  for (const l of ledger ?? []) if (!balById.has(l.user_id)) balById.set(l.user_id, Number(l.balance_after));

  const rows: MemberRow[] = (list?.users ?? []).map((u) => {
    const prof = profById.get(u.id);
    const role = (u.app_metadata as { role?: string } | undefined)?.role === "admin" ? "admin" : "user";
    return { id: u.id, email: u.email ?? "(no email)", name: prof?.display_name ?? null, role, plan: prof?.plan ?? "payg", balance: balById.get(u.id) ?? 0, joined: u.created_at };
  }).sort((a, b) => (a.email > b.email ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-medium">Members</h2>
          <p className="text-sm text-fg-muted">Every user, their role and credit balance. Grant credits or promote to admin — both are audit-logged.</p>
        </div>
        <p className="text-sm text-fg-muted num"><span className="text-2xl font-semibold text-fg">{rows.length}</span> members</p>
      </div>
      <MembersTable rows={rows} />
    </div>
  );
}
