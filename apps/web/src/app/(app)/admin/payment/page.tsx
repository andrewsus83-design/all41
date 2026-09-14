import { adminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Payment · Admin" };
export const dynamic = "force-dynamic";

const toneFor: Record<string, "green" | "amber" | "coral" | "violet" | "neutral"> = { topup: "green", grant: "violet", deduct: "neutral", refund: "amber" };

export default async function PaymentPage() {
  const db = adminClient();
  const { data: ledger } = await db.from("credit_ledger").select("type,amount_usd,note,user_id,created_at,stripe_payment_id").order("created_at", { ascending: false }).limit(2000);
  const rows = ledger ?? [];
  const sum = (t: string) => rows.filter((r) => r.type === t).reduce((n, r) => n + Number(r.amount_usd), 0);
  const totals = { topup: sum("topup"), grant: sum("grant"), deduct: sum("deduct"), refund: sum("refund") };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Payment & credits</h2>
        <p className="text-sm text-fg-muted">Credits are the ledger of record (Stripe tops them up). Pay-per-use: users are only ever deducted for work that runs. Grants and refunds are admin actions (from Members).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[["Top-ups", totals.topup, "green"], ["Grants", totals.grant, "violet"], ["Used", totals.deduct, "coral"], ["Refunds", totals.refund, "amber"]].map(([label, v]) => (
          <Card key={label as string} className="space-y-1">
            <p className="text-3xl font-semibold num">${(v as number).toFixed(2)}</p>
            <p className="text-sm text-fg-muted">{label as string}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-3 overflow-x-auto">
        <CardTitle>Recent transactions</CardTitle>
        <table className="w-full text-sm border-collapse">
          <thead className="text-fg-faint text-xs uppercase tracking-wide"><tr>
            <th className="text-left py-2 pr-4">Type</th><th className="text-left py-2 pr-4">Amount</th><th className="text-left py-2 pr-4">Note</th><th className="text-left py-2 pr-4">User</th><th className="text-left py-2">When</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, 60).map((r, i) => (
              <tr key={i}>
                <td className="py-2 pr-4"><Badge tone={toneFor[r.type] ?? "neutral"}>{r.type}</Badge></td>
                <td className="py-2 pr-4 num">${Number(r.amount_usd).toFixed(4)}</td>
                <td className="py-2 pr-4 text-fg-muted truncate max-w-[16rem]">{r.note ?? (r.stripe_payment_id ? "stripe" : "—")}</td>
                <td className="py-2 pr-4 num text-xs text-fg-faint">{r.user_id.slice(0, 8)}</td>
                <td className="py-2 num text-xs text-fg-faint">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-fg-muted text-sm">No transactions yet.</p>}
      </Card>
    </div>
  );
}
