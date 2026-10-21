import { z } from "zod";

const prize = z
  .object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().int(),
    awarded: z.number().int(),
    sort_order: z.number().int().optional(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    awarded: row.awarded,
    sortOrder: row.sort_order ?? 0,
  }));

/** A prize with how many winners it has given out so far. */
export type RafflePrize = z.output<typeof prize>;

export const MAX_PRIZES = 100;

const summary = z
  .object({ checked_in: z.number().int(), remaining: z.number().int(), prizes: z.array(prize) })
  .transform((row) => ({ checkedIn: row.checked_in, remaining: row.remaining, prizes: row.prizes }));

/** The prizes and the size of the pool, for the raffle pages. */
export type RaffleSummary = z.output<typeof summary>;
export const parseRaffleSummary = (value: unknown): RaffleSummary => summary.parse(value);

const drawResult = z
  .object({
    draw: z.object({ id: z.string(), status: z.enum(["won", "forfeited"]), drawn_at: z.string() }),
    guest: z.object({ name: z.string(), table_no: z.string().nullable(), tags: z.array(z.string()) }),
    prize,
    remaining: z.number().int(),
    decoys: z.array(z.string()),
  })
  .transform((row) => ({
    drawId: row.draw.id,
    drawnAt: row.draw.drawn_at,
    winner: { name: row.guest.name, tableNo: row.guest.table_no, tags: row.guest.tags },
    prize: row.prize,
    remaining: row.remaining,
    decoys: row.decoys,
  }));

/** The winner the server chose, with the other names the screen spins through on the way. */
export type DrawResult = z.output<typeof drawResult>;
export const parseDrawResult = (value: unknown): DrawResult => drawResult.parse(value);

const forfeitResult = z
  .object({ draw_id: z.string(), prize, remaining: z.number().int() })
  .transform((row) => ({ drawId: row.draw_id, prize: row.prize, remaining: row.remaining }));

export type ForfeitResult = z.output<typeof forfeitResult>;
export const parseForfeitResult = (value: unknown): ForfeitResult => forfeitResult.parse(value);

const logEntries = z.array(
  z
    .object({
      id: z.string(),
      status: z.enum(["won", "forfeited"]),
      prize_id: z.string(),
      prize_name: z.string(),
      guest_name: z.string(),
      guest_table_no: z.string().nullable(),
      drawn_at: z.string(),
      drawn_by_email: z.string().nullable(),
      resolved_at: z.string().nullable(),
      resolved_by_email: z.string().nullable(),
    })
    .transform((row) => ({
      id: row.id,
      status: row.status,
      prizeId: row.prize_id,
      prizeName: row.prize_name,
      guestName: row.guest_name,
      guestTableNo: row.guest_table_no,
      drawnAt: row.drawn_at,
      drawnBy: row.drawn_by_email,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by_email,
    })),
);

export type RaffleLogEntry = z.output<typeof logEntries>[number];
export const parseRaffleLog = (value: unknown): RaffleLogEntry[] => logEntries.parse(value);

/** The prize that comes next: the first, in the owner's order, that still has winners to draw. */
export function nextPrize(prizes: RafflePrize[], after?: string): RafflePrize | undefined {
  const open = prizes.filter((candidate) => candidate.awarded < candidate.quantity);
  if (after) {
    const index = prizes.findIndex((candidate) => candidate.id === after);
    const later = prizes.slice(index + 1).find((candidate) => candidate.awarded < candidate.quantity);
    if (later) return later;
  }
  return open[0];
}
