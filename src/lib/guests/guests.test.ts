import { describe, expect, it } from "vitest";
import { sanitizeSearch } from "@/lib/events/search";
import { parseGuestFilters, guestsHref } from "./filters";
import { dedupeGuests, detectColumns, prepareImport } from "./import";
import { guestSchema, parseTags } from "./input";

const none = { emails: new Set<string>(), phones: new Set<string>() };

describe("parseTags", () => {
  it("splits on commas, semicolons and pipes, trims and drops case-insensitive repeats", () => {
    expect(parseTags("VIP; Sales, finance |  vip ,, Board  members")).toEqual(["VIP", "Sales", "finance", "Board members"]);
  });

  it("gives no tags for blank input", () => {
    expect(parseTags("  ;, ")).toEqual([]);
  });
});

describe("guestSchema", () => {
  it("cleans up a typical row", () => {
    expect(
      guestSchema.parse({ name: "  Dewi Lestari ", email: " Dewi@Example.COM ", phone: "0812-3456-7890", tags: "VIP; Sales", tableNo: " 4A " }),
    ).toEqual({
      name: "Dewi Lestari",
      email: "dewi@example.com",
      phone: "+6281234567890",
      tags: ["VIP", "Sales"],
      tableNo: "4A",
    });
  });

  it("treats blank and missing optional fields as null or empty", () => {
    expect(guestSchema.parse({ name: "Budi", email: "", phone: "  ", tableNo: undefined })).toEqual({
      name: "Budi",
      email: null,
      phone: null,
      tags: [],
      tableNo: null,
    });
  });

  it.each([
    [{ name: "" }, "Enter a name."],
    [{ name: "x", email: "not-an-email" }, "Invalid email address"],
    [{ name: "x", phone: "12345" }, "country code"],
    [{ name: "x", tableNo: "t".repeat(21) }, "table"],
    [{ name: "x", tags: Array.from({ length: 21 }, (_, i) => `t${i}`).join(",") }, "at most 20"],
  ])("rejects %j", (input, message) => {
    const result = guestSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(message);
  });
});

describe("detectColumns", () => {
  it("finds columns by their header, in any order and with Indonesian names", () => {
    const found = detectColumns(["No HP", "Nama", "E-mail", "Meja", "Kategori", "Notes"]);
    expect(found.hasHeader).toBe(true);
    expect(found.columns).toEqual({ phone: 0, name: 1, email: 2, tableNo: 3, tags: 4 });
    expect(found.ignored).toEqual(["Notes"]);
  });

  it("reads a file without a header in the default order", () => {
    const found = detectColumns(["Dewi Lestari", "dewi@example.com", "0812 3456 7890"]);
    expect(found.hasHeader).toBe(false);
    expect(found.columns).toEqual({ name: 0, email: 1, phone: 2 });
  });
});

describe("dedupeGuests", () => {
  const guest = (name: string, email: string | null, phone: string | null) => ({ name, email, phone, tags: [], tableNo: null });

  it("drops repeats of the event's guests and of earlier rows, keeping the first", () => {
    const existing = { emails: new Set(["old@example.com"]), phones: new Set(["+6281111111111"]) };
    const { ready, duplicates } = dedupeGuests(
      [
        guest("A", "a@example.com", null),
        guest("B", "old@example.com", null),
        guest("C", null, "+6281111111111"),
        guest("D", "a@example.com", null),
        guest("E", null, "+6282222222222"),
        guest("F", "f@example.com", "+6282222222222"),
      ],
      existing,
    );
    expect(ready.map((g) => g.name)).toEqual(["A", "E"]);
    expect(duplicates.map((d) => [d.guest.name, d.duplicateOf])).toEqual([
      ["B", { source: "event", field: "email" }],
      ["C", { source: "event", field: "phone" }],
      ["D", { source: "file", field: "email" }],
      ["F", { source: "file", field: "phone" }],
    ]);
  });

  it("keeps guests that have neither email nor phone", () => {
    expect(dedupeGuests([guest("A", null, null), guest("B", null, null)], none).ready).toHaveLength(2);
  });
});

describe("prepareImport", () => {
  const rows = [
    ["Name", "Email", "Phone", "Group", "Table"],
    ["Dewi Lestari", "dewi@example.com", "0812-3456-7890", "VIP; Board", "1"],
    ["Budi Santoso", "BUDI@example.com", "", "Sales", ""],
    ["", "noname@example.com", "", "", ""],
    ["Sari", "not-an-email", "", "", ""],
    ["Dewi Again", "dewi@example.com", "", "", ""],
    ["Already Here", "here@example.com", "", "", ""],
  ];

  it("labels every row as ready, duplicate or invalid, with its line number in the file", () => {
    const preview = prepareImport(rows, { emails: new Set(["here@example.com"]), phones: new Set() });
    expect(preview.hasHeader).toBe(true);
    expect(preview.counts).toEqual({ total: 6, ready: 2, duplicates: 2, invalid: 2 });
    expect(preview.rows.map((r) => [r.line, r.status])).toEqual([
      [2, "ready"],
      [3, "ready"],
      [4, "invalid"],
      [5, "invalid"],
      [6, "duplicate"],
      [7, "duplicate"],
    ]);
    const first = preview.rows[0];
    expect(first.status === "ready" && first.guest).toEqual({
      name: "Dewi Lestari",
      email: "dewi@example.com",
      phone: "+6281234567890",
      tags: ["VIP", "Board"],
      tableNo: "1",
    });
    const invalid = preview.rows[2];
    expect(invalid.status === "invalid" && invalid.errors).toEqual(["Enter a name."]);
  });

  it("numbers lines from 1 when there is no header", () => {
    const preview = prepareImport([["Dewi", "dewi@example.com"], ["Budi", ""]], none);
    expect(preview.hasHeader).toBe(false);
    expect(preview.rows.map((r) => r.line)).toEqual([1, 2]);
  });

  it("handles an empty file", () => {
    expect(prepareImport([], none).counts).toEqual({ total: 0, ready: 0, duplicates: 0, invalid: 0 });
  });

  it("reports a header-only file as having no guests", () => {
    expect(prepareImport([["Name", "Email"]], none).counts.total).toBe(0);
  });
});

describe("parseGuestFilters", () => {
  it("reads the search, status and page from the address", () => {
    expect(parseGuestFilters({ q: "dewi", status: "rsvp", page: "3" })).toEqual({ search: "dewi", status: "rsvp", page: 3 });
  });

  it("falls back to the first page without a filter for anything that does not fit", () => {
    expect(parseGuestFilters({})).toEqual({ search: "", status: undefined, page: 1 });
    expect(parseGuestFilters({ status: "nonsense", page: "-4" })).toMatchObject({ status: undefined, page: 1 });
    expect(parseGuestFilters({ page: "abc" }).page).toBe(1);
    expect(parseGuestFilters({ page: "2.5" }).page).toBe(2);
    expect(parseGuestFilters({ q: ["first", "second"] }).search).toBe("first");
  });

  it("strips characters that could change a database filter", () => {
    expect(parseGuestFilters({ q: "a,b.eq.(c)%*" }).search).toBe("ab.eq.c");
    expect(sanitizeSearch("  O'Brien \n\t Jr  ")).toBe("OBrien Jr");
    expect(sanitizeSearch("x".repeat(300))).toHaveLength(100);
  });
});

describe("guestsHref", () => {
  it("keeps the filters and leaves out what is default", () => {
    const base = "/dashboard/events/e1/guests";
    expect(guestsHref(base, { search: "", status: undefined }, 1)).toBe(base);
    expect(guestsHref(base, { search: "dewi", status: "rsvp" }, 2)).toBe(`${base}?q=dewi&status=rsvp&page=2`);
    expect(guestsHref(base, { search: "a b", status: undefined }, 1)).toBe(`${base}?q=a+b`);
  });
});
