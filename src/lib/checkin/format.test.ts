import { describe, expect, it } from "vitest";
import { formatAgo, formatClock } from "./format";

describe("formatClock", () => {
  it("shows the time in the event's time zone", () => {
    expect(formatClock("2026-12-05T12:42:00Z", "Asia/Jakarta")).toBe("19:42");
    expect(formatClock("2026-12-05T12:42:00Z", "Asia/Jayapura")).toBe("21:42");
    expect(formatClock("2026-12-05T16:05:00Z", "Asia/Jakarta")).toBe("23:05");
    expect(formatClock("2026-12-05T17:05:00Z", "Asia/Jakarta")).toBe("00:05");
  });
});

describe("formatAgo", () => {
  const now = new Date("2026-12-05T12:00:00Z");
  it("rounds to the way people say it", () => {
    expect(formatAgo("2026-12-05T11:59:40Z", now)).toBe("just now");
    expect(formatAgo("2026-12-05T11:57:00Z", now)).toBe("3 min ago");
    expect(formatAgo("2026-12-05T09:50:00Z", now)).toBe("2 h ago");
    expect(formatAgo("2026-12-03T12:00:00Z", now)).toBe("2 d ago");
  });

  it("never looks into the future", () => {
    expect(formatAgo("2026-12-05T12:05:00Z", now)).toBe("just now");
  });
});
