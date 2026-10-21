import { describe, expect, it } from "vitest";
import { buildCalendar } from "./ics";
import { calendarPath, eventUrl, invitationUrl, looksLikeSlug, looksLikeToken, mapsUrl } from "./links";
import { parseInvitation, parsePublicEvent, parseSubmitResult } from "./records";
import { parseRsvpForm } from "./rsvp";

describe("links", () => {
  const token = "a".repeat(32) + "b".repeat(32);

  it("builds the public and personal addresses from the site origin", () => {
    expect(eventUrl("annual-gala", "https://all41.app")).toBe("https://all41.app/e/annual-gala");
    expect(invitationUrl(token, "https://all41.app")).toBe(`https://all41.app/i/${token}`);
    expect(calendarPath("annual-gala")).toBe("/e/annual-gala/calendar.ics");
  });

  it("ignores a trailing slash on the origin", () => {
    expect(eventUrl("annual-gala", "http://localhost:3101/")).toBe("http://localhost:3101/e/annual-gala");
  });

  it("puts the token last, which is where check-in reads it", () => {
    expect(invitationUrl(token, "https://all41.app").split("/").pop()).toBe(token);
  });

  it("recognises what a token and a slug can look like, so junk never reaches the database", () => {
    expect(looksLikeToken(token)).toBe(true);
    expect(looksLikeToken("short")).toBe(false);
    expect(looksLikeToken(`${token}/../x`)).toBe(false);
    expect(looksLikeToken("x".repeat(500))).toBe(false);
    expect(looksLikeSlug("annual-gala-2026")).toBe(true);
    for (const bad of ["", "ab", "Annual", "a b c", "-gala", "gala-", "a--b", "x".repeat(41), "../etc"]) {
      expect(looksLikeSlug(bad)).toBe(false);
    }
  });

  it("links to a Maps search for the venue", () => {
    const url = new URL(mapsUrl("Grand Ballroom", "Jl. Sudirman 1,\nJakarta") ?? "");
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("query")).toBe("Grand Ballroom, Jl. Sudirman 1, Jakarta");
    expect(new URL(mapsUrl(null, "Jl. Sudirman 1") ?? "").searchParams.get("query")).toBe("Jl. Sudirman 1");
    expect(mapsUrl(null, null)).toBeNull();
    expect(mapsUrl("  ", "")).toBeNull();
  });
});

describe("buildCalendar", () => {
  const base = {
    uid: "annual-gala@all41.app",
    name: "Annual Gala",
    startsAt: "2026-12-05T11:00:00+00:00",
    endsAt: "2026-12-05T15:30:00+00:00",
    venueName: "Grand Ballroom",
    venueAddress: "Jl. Sudirman 1, Jakarta",
    url: "https://all41.app/e/annual-gala",
    now: new Date("2026-10-21T04:00:00Z"),
  };

  it("writes one event in UTC with CRLF line endings", () => {
    const text = buildCalendar(base);
    expect(text.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(text.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(text.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
    expect(text).toContain("UID:annual-gala@all41.app\r\n");
    expect(text).toContain("DTSTAMP:20261021T040000Z\r\n");
    expect(text).toContain("DTSTART:20261205T110000Z\r\n");
    expect(text).toContain("DTEND:20261205T153000Z\r\n");
    expect(text).toContain("SUMMARY:Annual Gala\r\n");
    expect(text).toContain("LOCATION:Grand Ballroom\\, Jl. Sudirman 1\\, Jakarta\r\n");
    expect(text).toContain("URL:https://all41.app/e/annual-gala\r\n");
  });

  it("escapes characters that mean something in the format", () => {
    const text = buildCalendar({ ...base, name: "Gala; black tie, 7pm\\8pm\nbring ID", venueName: null, venueAddress: null, url: undefined });
    expect(text).toContain("SUMMARY:Gala\\; black tie\\, 7pm\\\\8pm\\nbring ID\r\n");
    expect(text).not.toContain("LOCATION");
    expect(text).not.toContain("URL:");
  });

  it("folds long lines at 75 octets without splitting a character", () => {
    const text = buildCalendar({ ...base, name: "Pesta ulang tahun perusahaan ke-25 di Jakarta, malam penghargaan karyawan teladan 2026 ✨✨✨✨✨" });
    for (const line of text.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // unfolding gives the original text back
    const unfolded = text.replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:Pesta ulang tahun perusahaan ke-25 di Jakarta\\, malam penghargaan karyawan teladan 2026 ✨✨✨✨✨\r\n");
  });
});

describe("parseRsvpForm", () => {
  const ok = (values: Record<string, string>) => {
    const result = parseRsvpForm(values);
    if (!result.ok) throw new Error(`expected a valid form, got ${JSON.stringify(result.fieldErrors)}`);
    return result.input;
  };
  const errors = (values: Record<string, string>) => {
    const result = parseRsvpForm(values);
    if (result.ok) throw new Error("expected problems");
    return result.fieldErrors;
  };

  it("reads an attending answer with companions, a meal and a message", () => {
    expect(ok({ response: "attending", partySize: "3", mealPreference: " Halal ", message: " See you! " })).toEqual({
      response: "attending",
      partySize: 3,
      mealPreference: "Halal",
      message: "See you!",
    });
  });

  it("counts the guest alone when no party size is sent", () => {
    expect(ok({ response: "attending" })).toMatchObject({ partySize: 1, mealPreference: null, message: null });
  });

  it("makes a decline a party of one without a meal, whatever else was sent", () => {
    expect(ok({ response: "declined", partySize: "6", mealPreference: "Vegan", message: "Sorry" })).toEqual({
      response: "declined",
      partySize: 1,
      mealPreference: null,
      message: "Sorry",
    });
  });

  it("needs an answer", () => {
    expect(errors({})).toHaveProperty("response");
    expect(errors({ response: "maybe" })).toHaveProperty("response");
  });

  it.each(["0", "11", "-1", "2.5", "abc", "1e1", "99999"])("rejects a party size of %s", (partySize) => {
    expect(errors({ response: "attending", partySize })).toHaveProperty("partySize");
  });

  it("accepts the largest party and the longest texts, and rejects one more", () => {
    expect(ok({ response: "attending", partySize: "10", mealPreference: "m".repeat(100), message: "n".repeat(500) }).partySize).toBe(10);
    expect(errors({ response: "attending", mealPreference: "m".repeat(101) })).toHaveProperty("mealPreference");
    expect(errors({ response: "declined", message: "n".repeat(501) })).toHaveProperty("message");
  });
});

describe("what the database functions return", () => {
  const event = {
    slug: "annual-gala",
    name: "Annual Gala",
    type: "corporate",
    timezone: "Asia/Jakarta",
    starts_at: "2026-12-05T11:00:00+00:00",
    ends_at: "2026-12-05T15:30:00+00:00",
    venue_name: null,
    venue_address: null,
    theme: { preset: "gala", font: "classic" },
  };
  const rsvp = { response: "attending", party_size: 2, meal_preference: null, message: null, responded_at: "2026-10-21T04:00:00+00:00" };

  it("reads a public event, and nothing for none", () => {
    expect(parsePublicEvent(event)).toMatchObject({ slug: "annual-gala", startsAt: event.starts_at, theme: { preset: "gala", font: "classic" } });
    expect(parsePublicEvent(null)).toBeNull();
  });

  it("falls back to the default theme when the stored one is unreadable", () => {
    expect(parsePublicEvent({ ...event, theme: "nonsense" })?.theme).toEqual({ preset: "midnight", font: "modern" });
  });

  it("reads an invitation with and without an answer", () => {
    const base = { guest: { name: "Dewi", table_no: "A7" }, event, rsvp: null, rsvp_open: true, checked_in_at: null };
    expect(parseInvitation(base)).toMatchObject({ guestName: "Dewi", tableNo: "A7", rsvp: null, rsvpOpen: true });
    expect(parseInvitation({ ...base, rsvp })).toMatchObject({ rsvp: { response: "attending", partySize: 2 } });
    expect(parseInvitation(null)).toBeNull();
  });

  it("reads each outcome of an answer", () => {
    expect(parseSubmitResult({ ok: true, rsvp })).toMatchObject({ ok: true, rsvp: { partySize: 2 } });
    expect(parseSubmitResult({ ok: false, reason: "closed" })).toEqual({ ok: false, reason: "closed" });
    expect(parseSubmitResult({ ok: false, reason: "not_found" })).toEqual({ ok: false, reason: "not_found" });
    expect(parseSubmitResult({ ok: false, reason: "invalid", field: "party_size" })).toEqual({ ok: false, reason: "invalid", field: "party_size" });
    expect(() => parseSubmitResult({ ok: false, reason: "surprise" })).toThrow();
  });
});
