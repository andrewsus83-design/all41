import Link from "next/link";
import Image from "next/image";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { coverFor } from "@/content/covers";
import type { MarketingApp } from "@/app/(marketing)/_lib/data";
import type { RoadmapApp } from "@/content/apps";

export function AppCard({ app, replaces }: { app: MarketingApp; replaces?: string }) {
  const cover = coverFor(app.slug);
  return (
    <Link href={`/apps/${app.slug}`} className="group block h-full">
      <Card className="h-full p-0 overflow-hidden flex flex-col lift group-hover:border-line-strong group-hover:shadow-lift">
        {cover ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line">
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className="px-6 pt-6">
            <span className="text-4xl" aria-hidden>{app.icon ?? "◻"}</span>
          </div>
        )}
        <div className="flex flex-col gap-4 p-6">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">{app.name}</CardTitle>
            <CardHint>{app.description}</CardHint>
          </div>
          <div className="mt-auto space-y-1 text-sm">
            <p className="text-fg-muted">≈ <Money usd={app.est_credit_cost} /> per run</p>
            {replaces ? <p className="text-fg-faint">instead of {replaces}</p> : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function RoadmapCard({ app }: { app: RoadmapApp }) {
  return (
    <Card className="h-full space-y-5 border-dashed opacity-80">
      <div className="flex items-start justify-between gap-3">
        <span className="text-4xl" aria-hidden>{app.icon}</span>
        <Badge tone="neutral">coming</Badge>
      </div>
      <div className="space-y-1.5">
        <CardTitle className="text-xl">{app.name}</CardTitle>
        <CardHint>{app.description}</CardHint>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-fg-muted"><span className="num">{app.costLine}</span></p>
        <p className="text-fg-faint">instead of {app.replaces}</p>
      </div>
      <p className="text-xs text-fg-faint">Not available yet.</p>
    </Card>
  );
}
