import { describe, expect, it } from "vitest";
import { newEventValues, valuesFromEvent } from "./form-values";
import { eventFormSchema } from "./schema";
import { RESERVED_SLUGS, slugSchema, slugify } from "./slug";
import { THEME_PRESETS, accentProblem, contrastRatio, parseTheme, readableTextOn, resolveAccent } from "./theme";
import { addMinutesToLocal, formatEventDay, formatEventRange, utcToZonedInput, zonedTimeToUtc } from "./time";

describe("slugify", () => {
  it.each([
    ["Annual Dinner 2026!", "annual-dinner-2026"],
    ["  PT Maju   Jaya – Town Hall  ", "pt-maju-jaya-town-hall"],
    ["Café Ñandú", "cafe-nandu"],
    ["---", ""],
    ["日本", ""],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("cuts long names to 40 characters without a trailing hyphen", () => {
    const slug = slugify("a".repeat(39) + " bbb");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugSchema", () => {
  it.each(["town-hall-2026", "abc", "a1b2"])("accepts %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it("lowercases and trims", () => {
    expect(slugSchema.parse("  Town-Hall ")).toBe("town-hall");
  });

  it.each(["ab", "-abc", "abc-", "a--b", "a b c", "a_b_c", "x".repeat(41)])("rejects %j", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });

  it.each(RESERVED_SLUGS)("reserves %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });
});

describe("zonedTimeToUtc", () => {
  it.each([
    ["2026-12-05T18:00", "Asia/Jakarta", "2026-12-05T11:00:00.000Z"],
    ["2026-12-05T18:00", "Asia/Makassar", "2026-12-05T10:00:00.000Z"],
    ["2026-12-05T18:00", "Asia/Jayapura", "2026-12-05T09:00:00.000Z"],
    ["2026-12-05T00:30", "Asia/Jakarta", "2026-12-04T17:30:00.000Z"],
    // zones with daylight saving, to be sure nothing assumes a fixed offset
    ["2026-07-01T12:00", "America/New_York", "2026-07-01T16:00:00.000Z"],
    ["2026-01-01T12:00", "America/New_York", "2026-01-01T17:00:00.000Z"],
    ["2026-07-01T12:00", "Europe/London", "2026-07-01T11:00:00.000Z"],
  ])("%s in %s is %s", (local, zone, expected) => {
    expect(zonedTimeToUtc(local, zone)?.toISOString()).toBe(expected);
  });

  it.each(["", "2026-12-05", "2026-12-05 18:00", "2026-02-31T10:00", "2026-12-05T25:00", "2026-12-05T10:61"])(
    "refuses %j",
    (local) => {
      expect(zonedTimeToUtc(local, "Asia/Jakarta")).toBeNull();
    },
  );

  it("refuses an unknown zone", () => {
    expect(zonedTimeToUtc("2026-12-05T18:00", "Mars/Olympus")).toBeNull();
  });

  it("round-trips through utcToZonedInput", () => {
    for (const zone of ["Asia/Jakarta", "Asia/Jayapura", "America/New_York"]) {
      const utc = zonedTimeToUtc("2026-12-05T18:45", zone);
      expect(utc && utcToZonedInput(utc, zone)).toBe("2026-12-05T18:45");
    }
  });
});

describe("addMinutesToLocal", () => {
  it("moves a wall-clock time forward, across midnight and month ends", () => {
    expect(addMinutesToLocal("2026-12-05T18:00", 180)).toBe("2026-12-05T21:00");
    expect(addMinutesToLocal("2026-12-05T22:30", 180)).toBe("2026-12-06T01:30");
    expect(addMinutesToLocal("2026-12-31T23:00", 120)).toBe("2027-01-01T01:00");
  });

  it("refuses text that is not a date and time", () => {
    expect(addMinutesToLocal("", 60)).toBeNull();
    expect(addMinutesToLocal("2026-12-05", 60)).toBeNull();
  });
});

describe("formatEventDay", () => {
  it("names the day in the event's own time zone", () => {
    // 17:30 UTC on the 5th is already the 6th in Jakarta
    expect(formatEventDay("2026-12-05T17:30:00Z", "Asia/Jakarta")).toBe("Sunday 6 December 2026");
    expect(formatEventDay("2026-12-05T17:30:00Z", "UTC")).toBe("Saturday 5 December 2026");
  });
});

describe("formatEventRange", () => {
  it("writes a same-day event on one line, in the event's own zone", () => {
    expect(formatEventRange("2026-12-05T11:00:00Z", "2026-12-05T15:00:00Z", "Asia/Jakarta")).toBe(
      "Saturday 5 December 2026, 18:00 to 22:00",
    );
  });

  it("names both days when the event crosses midnight", () => {
    expect(formatEventRange("2026-12-05T15:00:00Z", "2026-12-05T19:00:00Z", "Asia/Jakarta")).toBe(
      "Saturday 5 December 2026, 22:00 to Sunday 6 December 2026, 02:00",
    );
  });
});

describe("readableTextOn", () => {
  it("picks black on light colors and white on dark ones", () => {
    expect(readableTextOn("#27e6ff")).toBe("#000000");
    expect(readableTextOn("#d4af5f")).toBe("#000000");
    expect(readableTextOn("#1a237e")).toBe("#ffffff");
    expect(readableTextOn("#7a1fa2")).toBe("#ffffff");
  });
});

describe("theme", () => {
  it("measures contrast on the WCAG scale", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("ships presets whose own accent reads well on their background", () => {
    for (const preset of ["midnight", "gala"] as const) {
      expect(accentProblem({ preset })).toBeNull();
      expect(contrastRatio(THEME_PRESETS[preset].text, THEME_PRESETS[preset].background)).toBeGreaterThan(7);
      expect(contrastRatio(THEME_PRESETS[preset].muted, THEME_PRESETS[preset].background)).toBeGreaterThan(4.5);
    }
  });

  it("flags an accent that is too dark for the background", () => {
    expect(accentProblem({ preset: "midnight", accent: "#101010" })).toContain("Midnight");
    expect(accentProblem({ preset: "midnight", accent: "#ff3ecb" })).toBeNull();
  });

  it("uses the preset accent unless the host picked one", () => {
    expect(resolveAccent({ preset: "gala" })).toBe(THEME_PRESETS.gala.accent);
    expect(resolveAccent({ preset: "gala", accent: "#ff3ecb" })).toBe("#ff3ecb");
  });

  it("falls back to defaults for a missing or unreadable stored theme", () => {
    expect(parseTheme({})).toEqual({ preset: "midnight", font: "modern" });
    expect(parseTheme(null)).toEqual({ preset: "midnight", font: "modern" });
    expect(parseTheme({ preset: "nope" })).toEqual({ preset: "midnight", font: "modern" });
    expect(parseTheme({ preset: "gala", accent: "#ff3ecb", font: "classic" })).toEqual({
      preset: "gala",
      accent: "#ff3ecb",
      font: "classic",
    });
  });
});

describe("eventFormSchema", () => {
  const valid = {
    name: "  Annual Dinner 2026 ",
    type: "corporate",
    slug: "annual-dinner-2026",
    timezone: "Asia/Jakarta",
    startsAt: "2026-12-05T18:00",
    endsAt: "2026-12-05T22:00",
    venueName: "Grand Ballroom",
    venueAddress: "",
    themePreset: "gala",
    themeAccent: "",
    themeFont: "modern",
  };

  it("turns the form into what the database stores", () => {
    expect(eventFormSchema.parse(valid)).toEqual({
      name: "Annual Dinner 2026",
      type: "corporate",
      slug: "annual-dinner-2026",
      timezone: "Asia/Jakarta",
      startsAt: "2026-12-05T11:00:00.000Z",
      endsAt: "2026-12-05T15:00:00.000Z",
      venueName: "Grand Ballroom",
      venueAddress: null,
      theme: { preset: "gala", font: "modern" },
    });
  });

  it("keeps a chosen accent in the theme", () => {
    expect(eventFormSchema.parse({ ...valid, themeAccent: "#FF3ECB" }).theme).toEqual({
      preset: "gala",
      font: "modern",
      accent: "#ff3ecb",
    });
  });

  const errorsFor = (input: Record<string, unknown>) => {
    const result = eventFormSchema.safeParse({ ...valid, ...input });
    if (result.success) return {};
    const fields: Record<string, string[]> = {};
    for (const issue of result.error.issues) (fields[String(issue.path[0])] ??= []).push(issue.message);
    return fields;
  };

  it("explains each problem next to its field", () => {
    expect(errorsFor({ name: " " }).name).toEqual(["Enter the event name."]);
    expect(errorsFor({ slug: "login" }).slug).toEqual(["That address is reserved. Pick another."]);
    expect(errorsFor({ type: "party" }).type).toEqual(["Choose corporate or wedding."]);
    expect(errorsFor({ timezone: "Mars/Olympus" }).timezone).toEqual(["Choose a time zone."]);
    expect(errorsFor({ startsAt: "" }).startsAt).toEqual(["Enter the start date and time."]);
    expect(errorsFor({ endsAt: "2026-12-05T17:00" }).endsAt).toEqual(["The event must end after it starts."]);
    expect(errorsFor({ endsAt: "2026-12-05T18:00" }).endsAt).toEqual(["The event must end after it starts."]);
    expect(errorsFor({ themeAccent: "#101010" }).themeAccent?.[0]).toContain("too dark");
    expect(errorsFor({ themeAccent: "red" }).themeAccent).toEqual(["Pick a color."]);
  });
});

describe("event form values", () => {
  it("start from a corporate midnight event in Jakarta", () => {
    expect(newEventValues()).toMatchObject({ type: "corporate", timezone: "Asia/Jakarta", themePreset: "midnight", themeFont: "modern", themeAccent: "" });
  });

  it("turn a stored event back into form text that the form schema accepts unchanged", () => {
    const event = {
      id: "e1",
      orgId: "o1",
      name: "Annual Dinner",
      slug: "annual-dinner",
      type: "corporate" as const,
      timezone: "Asia/Makassar",
      startsAt: "2026-12-05T10:00:00.000Z",
      endsAt: "2026-12-05T14:30:00.000Z",
      venueName: "Grand Ballroom",
      venueAddress: null,
      theme: { preset: "gala" as const, font: "classic" as const, accent: "#ff3ecb" },
      package: "pro" as const,
      extraGuests: 0,
      status: "draft" as const,
    };

    const values = valuesFromEvent(event);
    expect(values).toMatchObject({ startsAt: "2026-12-05T18:00", endsAt: "2026-12-05T22:30", venueAddress: "", themeAccent: "#ff3ecb" });

    const parsed = eventFormSchema.safeParse(values);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        name: "Annual Dinner",
        slug: "annual-dinner",
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        venueName: "Grand Ballroom",
        venueAddress: null,
        theme: event.theme,
      });
    }
  });
});
