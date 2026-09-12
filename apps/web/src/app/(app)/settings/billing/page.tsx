import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/finance";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { TopUp } from "./topup-client";

export const metadata = { title: "Billing" };

export default async function BillingPage(props: PageProps<"/settings/billing">) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [balance, { data: ledger }, { data: usage }] = await Promise.all([
    getBalance(user!.id).catch(() => 0),
    supabase.from("credit_ledger").select("id, type, amount_usd, balance_after, note, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("api_usage_log").select("id, api_provider, api_model, call_kind, input_tokens, output_tokens, api_credits, cost_usd, billed_usd, status, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const flash = typeof sp.status === "string" ? sp.status : null;

  return (
    <div className="space-y-8">
      {flash === "success" && <Card className="border-green/30 bg-green-soft"><p className="text-green">Payment received — your balance updates as soon as Stripe confirms.</p></Card>}
      {flash === "cancelled" && <Card className="border-amber/30"><p className="text-amber">Top-up cancelled. Nothing was charged.</p></Card>}
      <div className="grid md:grid-cols-[1fr_1.4fr] gap-6">
        <Card className="space-y-2">
          <CardHint>Credit balance</CardHint>
          <p className="text-6xl font-semibold"><Money usd={balance} /></p>
          <CardHint>Plain dollars. Deducted per task at real cost × markup. Never expires.</CardHint>
        </Card>
        <TopUp />
      </div>

      <section className="space-y-3">
        <CardTitle className="text-xl">Ledger</CardTitle>
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-fg-faint"><tr className="border-b border-line"><th className="text-left px-6 py-3">Type</th><th className="text-right px-4 py-3">Amount</th><th className="text-right px-4 py-3">Balance after</th><th className="text-left px-4 py-3">Note</th><th className="text-right px-6 py-3">Time</th></tr></thead>
            <tbody>
              {(ledger ?? []).length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-fg-faint">No ledger entries yet.</td></tr>}
              {(ledger ?? []).map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3"><Badge tone={l.type === "deduct" ? "neutral" : "green"}>{l.type}</Badge></td>
                  <td className={`px-4 py-3 text-right ${l.type === "deduct" ? "text-fg-muted" : "text-green"}`}>{l.type === "deduct" ? "−" : "+"}<Money usd={Math.abs(Number(l.amount_usd))} precision={4} /></td>
                  <td className="px-4 py-3 text-right"><Money usd={Number(l.balance_after)} /></td>
                  <td className="px-4 py-3 text-fg-muted max-w-xs truncate">{l.note ?? "—"}</td>
                  <td className="px-6 py-3 text-right num text-xs text-fg-faint">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-xl">Usage</CardTitle>
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-fg-faint"><tr className="border-b border-line"><th className="text-left px-6 py-3">Provider / model</th><th className="text-left px-4 py-3">Kind</th><th className="text-right px-4 py-3">Tokens</th><th className="text-right px-4 py-3">Cost → billed</th><th className="text-right px-6 py-3">Time</th></tr></thead>
            <tbody>
              {(usage ?? []).length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-fg-faint">No usage yet.</td></tr>}
              {(usage ?? []).map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3 num text-xs">{u.api_provider}:{u.api_model}{u.status !== "ok" && <span className="text-red"> · {u.status}</span>}</td>
                  <td className="px-4 py-3 text-fg-muted">{u.call_kind}</td>
                  <td className="px-4 py-3 text-right num text-xs text-fg-muted">{u.call_kind === "llm" ? `${u.input_tokens} → ${u.output_tokens}` : `${u.api_credits} call`}</td>
                  <td className="px-4 py-3 text-right"><Money usd={Number(u.cost_usd)} precision={5} className="text-fg-faint" /> → <Money usd={Number(u.billed_usd)} precision={5} /></td>
                  <td className="px-6 py-3 text-right num text-xs text-fg-faint">{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
