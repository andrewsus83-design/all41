import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatStamp } from "@/lib/checkin/format";
import type { RaffleLogEntry } from "@/lib/raffle/records";

/** Every draw, newest first: who drew, when, and whether the winner took the prize. It cannot be edited. */
export function AuditLog({ entries, timeZone }: { entries: RaffleLogEntry[]; timeZone: string }) {
  return (
    <Card className="space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="font-display text-xl font-semibold">Audit log</h2>
        <p className="text-sm text-muted">Every draw is kept here, with who drew it. Nobody can edit or delete these entries.</p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-muted">Nothing has been drawn yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-x-6 gap-y-1 px-4 py-3.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5">
              <p className="text-sm text-muted tabular-nums">{formatStamp(entry.drawnAt, timeZone)}</p>
              <div className="min-w-0">
                <p className="font-bold break-words">{entry.guestName}</p>
                <p className="text-sm text-muted">{entry.guestTableNo ? `Table ${entry.guestTableNo}` : "No table"}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="font-bold break-words">{entry.prizeName}</p>
                <p className="text-muted break-all">
                  Drawn by {entry.drawnBy ?? "a former team member"}
                  {entry.status === "forfeited" && entry.resolvedAt && (
                    <>
                      {" · "}absent, marked {formatStamp(entry.resolvedAt, timeZone)} by {entry.resolvedBy ?? "a former team member"}
                    </>
                  )}
                </p>
              </div>
              <Badge tone={entry.status === "won" ? "success" : "warning"}>{entry.status === "won" ? "Won" : "Absent"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
