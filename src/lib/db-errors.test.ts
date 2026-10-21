import { describe, expect, it } from "vitest";
import { classifyDbError } from "./db-errors";

describe("classifyDbError", () => {
  it("names the unique constraint that was hit", () => {
    const unique = (constraint: string) => ({
      code: "23505",
      message: `duplicate key value violates unique constraint "${constraint}"`,
    });
    expect(classifyDbError(unique("a41_events_slug_key"))).toBe("slug_taken");
    expect(classifyDbError(unique("a41_guests_event_email_key"))).toBe("duplicate_email");
    expect(classifyDbError(unique("a41_guests_event_phone_key"))).toBe("duplicate_phone");
    expect(classifyDbError(unique("a41_guests_token_key"))).toBe("unknown");
  });

  it("reads the rule a trigger raised", () => {
    for (const rule of ["guest_capacity_exceeded", "free_event_limit", "capacity_cannot_decrease", "extra_guests_not_available"]) {
      expect(classifyDbError({ code: "23514", message: rule })).toBe(rule);
    }
    expect(classifyDbError({ code: "23514", message: 'new row violates check constraint "a41_events_check"' })).toBe("unknown");
  });

  it("recognises missing permission and a missing parent row", () => {
    expect(classifyDbError({ code: "42501", message: 'new row violates row-level security policy for table "a41_events"' })).toBe("forbidden");
    expect(classifyDbError({ code: "23503", message: "violates foreign key constraint" })).toBe("missing_parent");
  });

  it("treats anything else as unknown", () => {
    expect(classifyDbError({})).toBe("unknown");
    expect(classifyDbError({ code: "PGRST301", message: "JWT expired" })).toBe("unknown");
  });
});
