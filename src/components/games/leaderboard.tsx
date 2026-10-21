import { Crown } from "lucide-react";

export interface BoardRow {
  id: string;
  rank: number;
  name: string;
  score: number;
}

/**
 * The kit's leaderboard: the leader in a gold-edged row, everybody else quiet.
 * `stage` is the big-screen size. `meId` marks the row of the person looking.
 */
export function Leaderboard({
  rows,
  meId,
  unit = "pts",
  size = "phone",
  empty = "Nobody has scored yet.",
}: {
  rows: BoardRow[];
  meId?: string;
  unit?: string;
  size?: "phone" | "stage";
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-muted">{empty}</p>;
  const stage = size === "stage";

  return (
    <ol className={stage ? "space-y-2.5" : "space-y-2"}>
      {rows.map((row) => {
        const leader = row.rank === 1;
        const mine = row.id === meId;
        return (
          <li
            key={row.id}
            aria-current={mine ? "true" : undefined}
            className={`flex items-center justify-between gap-3 rounded-2xl border ${stage ? "px-5 py-3" : "px-3.5 py-2.5"} ${
              leader
                ? "border-gold/40 bg-gradient-to-r from-surface to-panel shadow-gold"
                : mine
                  ? "border-neon-cyan/60 bg-neon-cyan/10"
                  : "border-transparent bg-surface"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <span
                className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
                  stage ? "size-12 text-2xl" : "size-9 text-base"
                } ${leader ? "bg-gold text-black" : "bg-zinc-800 text-zinc-300"}`}
              >
                {leader ? <Crown className={stage ? "size-6" : "size-4"} aria-label="1" /> : row.rank}
              </span>
              <span className={`truncate font-display font-medium ${stage ? "text-2xl" : "text-base"} ${leader ? "text-fg" : "text-zinc-300"}`}>
                {row.name}
                {mine && <span className="ml-2 text-xs font-bold tracking-wide text-neon-cyan uppercase">You</span>}
              </span>
            </div>
            <span className={`shrink-0 font-display font-bold tabular-nums ${stage ? "text-3xl" : "text-lg"} ${leader ? "text-neon-cyan" : "text-fg"}`}>
              {row.score.toLocaleString("en-US")}
              <span className={`ml-1.5 font-medium text-muted ${stage ? "text-lg" : "text-xs"}`}>{unit}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
