import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { crewIdsOf } from "@/lib/engine/app-manifest";
import { NewAppBar } from "./new-app-bar";

export const metadata = { title: "Apps · Admin" };
export const dynamic = "force-dynamic";

export default async function AppsAdminPage() {
  const db = adminClient();
  const { data: apps } = await db.from("mini_apps")
    .select("slug,name,category,icon,autonomy_level,is_published,version,sort_order,updated_at,workflow_def")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-medium">Apps</h2>
          <p className="text-sm text-fg-muted max-w-2xl">Each app is a versioned manifest — config questions + workflow steps. Data-only apps (Level 1–2) are editable & publishable live here; crew-backed apps (Level 3) edit their config here while the crew logic ships in code. Every save snapshots a version you can roll back to.</p>
        </div>
        <NewAppBar />
      </div>

      <div className="overflow-x-auto squircle rounded-4 border border-line">
        <table className="w-full text-sm border-collapse">
          <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
            <tr>
              <th className="text-left font-medium py-3 px-4">App</th>
              <th className="text-left font-medium py-3 px-4">Type</th>
              <th className="text-left font-medium py-3 px-4">Level</th>
              <th className="text-left font-medium py-3 px-4">Status</th>
              <th className="text-left font-medium py-3 px-4">Ver</th>
              <th className="text-left font-medium py-3 px-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(apps ?? []).map((a) => {
              const crews = crewIdsOf({ workflow_def: (a.workflow_def as { steps?: [] }) as never });
              const backed = crews.length > 0;
              return (
                <tr key={a.slug} className="border-t border-line bg-bg-elev hover:bg-bg-elev-2 transition">
                  <td className="py-3 px-4">
                    <Link href={`/admin/apps/${a.slug}`} className="flex items-center gap-2 hover:underline">
                      <span>{a.icon ?? "▫"}</span>
                      <span className="font-medium">{a.name}</span>
                      <span className="num text-xs text-fg-faint">{a.slug}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4">{backed ? <Badge tone="violet">crew: {crews.join(", ")}</Badge> : <Badge tone="sky">data-only</Badge>}</td>
                  <td className="py-3 px-4 num text-fg-muted">L{a.autonomy_level}</td>
                  <td className="py-3 px-4">{a.is_published ? <Badge tone="green">published</Badge> : <Badge tone="amber">draft</Badge>}</td>
                  <td className="py-3 px-4 num text-fg-muted">v{a.version ?? 1}</td>
                  <td className="py-3 px-4 num text-xs text-fg-faint">{a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(apps ?? []).length === 0 && <p className="text-fg-muted text-sm">No apps yet.</p>}
      <p className="text-xs text-fg-faint">Tip: edit apps live here; use “Export” on an app to snapshot its manifest as JSON for git or transfer.</p>
    </div>
  );
}
