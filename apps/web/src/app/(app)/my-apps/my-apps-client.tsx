"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { InstanceDetailPanel } from "@/components/apps/instance-detail";
import { relative, scheduleLabel, statusLabel, statusTone } from "@/components/apps/format";
import type { DataLists, InstanceDetail, InstanceSummary } from "@/components/apps/types";

export function MyAppsClient({ list, detail, data, balance }: { list: InstanceSummary[]; detail: InstanceDetail | null; data: DataLists; balance: number }) {
  const router = useRouter();
  return (
    <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 max-w-7xl">
      <aside className="space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Your apps <span className="num text-fg-faint">{list.length}</span></h2>
          <Link href="/build" className="text-sm text-green hover:underline">+ Build</Link>
        </div>
        {list.length === 0 ? (
          <Card className="space-y-2">
            <CardTitle>No apps yet.</CardTitle>
            <CardHint><Link href="/build" className="text-green underline">Build one →</Link></CardHint>
          </Card>
        ) : (
          <ul className="space-y-2">
            {list.map((i) => {
              const active = detail?.id === i.id;
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => router.push(`/my-apps?id=${i.id}`, { scroll: false })} className={cn("w-full text-left squircle rounded-3 border p-5 transition space-y-3", active ? "bg-bg-elev-2 border-line-strong" : "bg-bg-elev border-line hover:border-line-strong")}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none">{i.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-title font-medium truncate">{i.name}</p>
                        <p className="text-xs text-fg-faint truncate">{i.appName}</p>
                      </div>
                      <Badge tone={statusTone(i.status)}>{statusLabel(i.status)}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                      <span className="squircle rounded-1 bg-bg border border-line px-2 py-0.5">{scheduleLabel(i.schedule)}</span>
                      <span>next <span className="num">{i.status === "active" && i.nextRunAt ? relative(i.nextRunAt) : "—"}</span></span>
                      <span>last <span className="num">{relative(i.lastRunAt)}</span></span>
                      <span><span className="num">{i.runCount}</span> {i.runCount === 1 ? "run" : "runs"}</span>
                      {i.lastBilled !== null && <span>last billed <Money usd={i.lastBilled} /></span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <section className="min-w-0">
        {detail ? (
          <InstanceDetailPanel detail={detail} data={data} balance={balance} />
        ) : list.length > 0 ? (
          <Card><CardHint>Pick an app on the left.</CardHint></Card>
        ) : (
          <Card className="space-y-3">
            <CardTitle className="text-2xl">Nothing here yet.</CardTitle>
            <CardHint>Build your first app — the consultant asks a few questions and runs it for you before anything goes live.</CardHint>
            <Link href="/build" className="text-green underline text-sm">Go to Build →</Link>
          </Card>
        )}
      </section>
    </div>
  );
}
