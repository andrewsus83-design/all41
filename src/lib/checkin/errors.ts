import { classifyDbError, type DbError } from "@/lib/db-errors";

export const SIGNED_OUT = "Your session has ended. Sign in again to keep checking guests in.";
export const NO_ACCESS = "You do not have access to check guests in for this event.";
export const OWNER_ONLY_UNDO = "Only an owner can undo a check-in.";
export const TRY_AGAIN = "Something went wrong on our side. Try again.";

export interface Problem {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** What to tell the person at the door when a check-in call fails. */
export function checkinProblem(error: DbError): Problem {
  if (error.code === "42501") return { error: NO_ACCESS };
  return { error: TRY_AGAIN };
}

/** Walk-ins add a guest, so the guest list rules can answer back. */
export function walkInProblem(error: DbError): Problem {
  const failure = classifyDbError(error);
  switch (failure) {
    case "guest_capacity_exceeded":
      return { error: "The guest list is full, so this guest cannot be added. Remove a guest or add capacity first." };
    case "duplicate_email":
      return { fieldErrors: { email: ["Another guest on this list already has that email. Search for them instead."] } };
    case "duplicate_phone":
      return { fieldErrors: { phone: ["Another guest on this list already has that phone number. Search for them instead."] } };
    case "forbidden":
      return { error: "Only an owner can add a walk-in guest." };
    default:
      return { error: TRY_AGAIN };
  }
}
