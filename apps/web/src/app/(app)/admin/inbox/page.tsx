import { adminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardHint } from "@/components/ui/card";

export const metadata = { title: "Inbox · Admin" };
export const dynamic = "force-dynamic";

const dirTone: Record<string, "sky" | "green"> = { inbound: "sky", outbound: "green" };
const statusTone: Record<string, "amber" | "neutral" | "green" | "violet"> = { unread: "amber", read: "neutral", replied: "green", archived: "violet" };

export default async function InboxPage() {
  const { data: messages } = await adminClient().from("inbox_messages").select("direction,from_email,to_email,subject,status,created_at").order("created_at", { ascending: false }).limit(100);
  const rows = messages ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Inbox</h2>
        <p className="text-sm text-fg-muted max-w-2xl">Email in and out of all41 in one place — delivery of app results (outbound) and replies/support (inbound). Inbound arrives via a provider webhook at <span className="num">/api/email/inbound</span>.</p>
      </div>

      {rows.length === 0 ? (
        <Card className="space-y-2">
          <CardTitle>No messages yet</CardTitle>
          <CardHint>Connect an email provider (Resend / Postmark) and point its inbound webhook at <span className="num">/api/email/inbound</span>. Outbound app-result emails will also be logged here.</CardHint>
        </Card>
      ) : (
        <div className="overflow-x-auto squircle rounded-4 border border-line">
          <table className="w-full text-sm border-collapse">
            <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev"><tr>
              <th className="text-left font-medium py-3 px-4">Dir</th><th className="text-left font-medium py-3 px-4">From / To</th><th className="text-left font-medium py-3 px-4">Subject</th><th className="text-left font-medium py-3 px-4">Status</th><th className="text-left font-medium py-3 px-4">When</th>
            </tr></thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={i} className="border-t border-line bg-bg-elev">
                  <td className="py-3 px-4"><Badge tone={dirTone[m.direction] ?? "neutral"}>{m.direction}</Badge></td>
                  <td className="py-3 px-4 num text-xs text-fg-muted">{m.direction === "inbound" ? m.from_email : m.to_email}</td>
                  <td className="py-3 px-4 truncate max-w-[20rem]">{m.subject ?? "(no subject)"}</td>
                  <td className="py-3 px-4"><Badge tone={statusTone[m.status] ?? "neutral"}>{m.status}</Badge></td>
                  <td className="py-3 px-4 num text-xs text-fg-faint">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
