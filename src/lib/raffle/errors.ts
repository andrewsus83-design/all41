import type { DbError } from "@/lib/db-errors";

/**
 * The failures of the raffle that a person can understand and act on. The
 * database raises these names as the message of its errors; a test against the
 * real schema keeps the two sides equal.
 */
export type RaffleFailure =
  | "prize_not_found"
  | "draw_not_found"
  | "draw_not_open"
  | "prize_fully_awarded"
  | "no_eligible_guests"
  | "prize_quantity_below_awarded"
  | "raffle_prize_limit"
  | "prize_drawn"
  | "forbidden"
  | "unknown";

const NAMED = new Set<RaffleFailure>([
  "prize_not_found",
  "draw_not_found",
  "draw_not_open",
  "prize_fully_awarded",
  "no_eligible_guests",
  "prize_quantity_below_awarded",
  "raffle_prize_limit",
]);

export function classifyRaffleError(error: DbError): RaffleFailure {
  const message = (error.message ?? "") as RaffleFailure;
  switch (error.code) {
    case "P0001":
    case "23514":
      return NAMED.has(message) ? message : "unknown";
    case "23503":
      // the only foreign key a prize delete can break is the one from a draw
      return "prize_drawn";
    case "42501":
      return "forbidden";
    default:
      return "unknown";
  }
}

export const RAFFLE_MESSAGES: Record<RaffleFailure, string> = {
  prize_not_found: "That prize no longer exists.",
  draw_not_found: "That draw no longer exists.",
  draw_not_open: "That winner was already marked absent. The screen will refresh.",
  prize_fully_awarded: "Every winner of this prize has been drawn.",
  no_eligible_guests: "Nobody is left to draw. Only guests who have checked in can win, and each guest can win once.",
  prize_quantity_below_awarded: "This prize has already given out more winners than that. Mark a winner absent first, or pick a higher number.",
  raffle_prize_limit: "An event can have up to 100 prizes.",
  prize_drawn: "This prize has been drawn, so it stays in the audit log and cannot be deleted.",
  forbidden: "Only an owner can manage prizes.",
  unknown: "Something went wrong on our side. Try again.",
};

export const describeRaffleError = (error: DbError): string => RAFFLE_MESSAGES[classifyRaffleError(error)];
