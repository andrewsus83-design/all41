import { describe, expect, it } from "vitest";
import { formatBytes, formatPhotoTime, wallAddress } from "./format";

describe("formatBytes", () => {
  it.each([
    [0, "0 KB"],
    [Number.NaN, "0 KB"],
    [-5, "0 KB"],
    [400, "1 KB"],
    [1_000, "1 KB"],
    [24_600, "25 KB"],
    [999_000, "999 KB"],
    [1_000_000, "1 MB"],
    [3_450_000, "3.5 MB"],
    [48_000_000, "48 MB"],
    [250_000_000, "250 MB"],
    [1_400_000_000, "1.4 GB"],
  ])("writes %s as %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("formatPhotoTime", () => {
  it("uses the event's time zone", () => {
    expect(formatPhotoTime("2026-10-21T12:42:00Z", "Asia/Jakarta")).toBe("21 Oct, 19:42");
    expect(formatPhotoTime("2026-10-21T12:42:00Z", "Asia/Jayapura")).toBe("21 Oct, 21:42");
  });

  it("rolls over to the next day in the zone", () => {
    expect(formatPhotoTime("2026-10-21T20:00:00Z", "Asia/Jakarta")).toBe("22 Oct, 03:00");
  });
});

describe("wallAddress", () => {
  it("joins the site, the slug and the wall key", () => {
    expect(wallAddress("https://all41.app", "gala", "abc")).toBe("https://all41.app/wall/gala/abc");
    expect(wallAddress("http://localhost:3103/", "gala", "abc")).toBe("http://localhost:3103/wall/gala/abc");
  });
});
