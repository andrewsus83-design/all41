/** The parts of a failed Supabase statement that we read. PostgrestError has these and more. */
export interface DbError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

/**
 * The failures a person can cause and fix: a taken address, a duplicate guest,
 * a full guest list. Everything else is a fault on our side or the network.
 * A test against the real schema keeps these names equal to the database's.
 */
export type DbFailure =
  | "slug_taken"
  | "duplicate_email"
  | "duplicate_phone"
  | "guest_capacity_exceeded"
  | "free_event_limit"
  | "capacity_cannot_decrease"
  | "extra_guests_not_available"
  | "forbidden"
  | "missing_parent"
  | "unknown";

const UNIQUE_CONSTRAINTS: Record<string, DbFailure> = {
  a41_events_slug_key: "slug_taken",
  a41_guests_event_email_key: "duplicate_email",
  a41_guests_event_phone_key: "duplicate_phone",
};

const RULES = new Set<DbFailure>([
  "guest_capacity_exceeded",
  "free_event_limit",
  "capacity_cannot_decrease",
  "extra_guests_not_available",
]);

export function classifyDbError(error: DbError): DbFailure {
  const message = error.message ?? "";
  switch (error.code) {
    case "23505": {
      const constraint = /unique constraint "([^"]+)"/.exec(message)?.[1];
      return (constraint && UNIQUE_CONSTRAINTS[constraint]) || "unknown";
    }
    case "23514":
      // The triggers in the schema raise their rule name as the message.
      return RULES.has(message as DbFailure) ? (message as DbFailure) : "unknown";
    case "23503":
      return "missing_parent";
    case "42501":
      return "forbidden";
    default:
      return "unknown";
  }
}
