"use client";
import { Fragment, useMemo } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";

export type BenchRow = { task_type: string; model: string; score: number; latency_ms: number | null; cost_per_run: number | null; is_leader: boolean };

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, BenchRow>();
const EMPTY: BenchRow[] = [];

export function ModelsTable({ rows, mode }: { rows: BenchRow[]; mode: "benchmark" | "weights" }) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("model", { header: "Model", cell: (c) => <span className="num text-sm">{c.getValue()}</span> }),
        helper.accessor("score", { header: mode === "benchmark" ? "Score" : "Weight", cell: (c) => <span className="num">{c.getValue().toFixed(mode === "benchmark" ? 1 : 2)}</span> }),
        helper.accessor("latency_ms", { header: "Latency", cell: (c) => (c.getValue() === null ? <span className="text-fg-faint">—</span> : <span className="num">{c.getValue()} ms</span>) }),
        helper.accessor("cost_per_run", { header: "Cost / run", cell: (c) => (c.getValue() === null ? <span className="text-fg-faint">—</span> : <Money usd={Number(c.getValue())} precision={4} />) }),
        helper.accessor("is_leader", { header: "", cell: (c) => (c.getValue() ? <Badge tone="green">leader</Badge> : null) }),
      ]),
    [mode],
  );
  const table = useTable({ features, columns, data: rows.length ? rows : EMPTY });
  const modelRows = table.getRowModel().rows;

  return (
    <div className="squircle bg-bg-elev border border-line rounded-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-fg-faint">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-line">
              {hg.headers.map((h) => (
                <th key={h.id} className="text-left px-6 py-3 font-medium">{h.isPlaceholder ? null : <table.FlexRender header={h} />}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {modelRows.map((row, i) => {
            const prev = modelRows[i - 1]?.original.task_type;
            const group = row.original.task_type;
            return (
              <Fragment key={row.id}>
                {group !== prev && (
                  <tr className="bg-bg-elev-2/60 border-b border-line">
                    <td colSpan={columns.length} className="px-6 py-2 font-title text-fg-muted">{group}</td>
                  </tr>
                )}
                <tr className={cn("border-b border-line last:border-0", row.original.is_leader && "bg-green-soft")}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-3"><table.FlexRender cell={cell} /></td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-6 py-8 text-fg-faint">No data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
