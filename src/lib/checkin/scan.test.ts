import { describe, expect, it } from "vitest";
import { extractToken } from "./scan";

const token = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

describe("extractToken", () => {
  it("reads the last path segment of an invitation link", () => {
    expect(extractToken(`https://all41.app/i/${token}`)).toBe(token);
    expect(extractToken(`http://localhost:3102/i/${token}`)).toBe(token);
  });

  it("ignores a trailing slash, a query string, a fragment and surrounding space", () => {
    expect(extractToken(`  https://all41.app/i/${token}/  `)).toBe(token);
    expect(extractToken(`https://all41.app/i/${token}?utm=qr#top`)).toBe(token);
  });

  it("works for any host, because the database decides whether the token is real", () => {
    expect(extractToken(`https://preview-123.vercel.app/i/${token}`)).toBe(token);
  });

  it("accepts a bare token", () => {
    expect(extractToken(token)).toBe(token);
    expect(extractToken(`\n${token}\n`)).toBe(token);
  });

  it("rejects text that is not a pass", () => {
    for (const text of ["", "   ", "hello world", "WIFI:S:venue;T:WPA;P:secret;;", "https://all41.app/", "https://all41.app/i/", "short", "a b c d e f g h i j"]) {
      expect(extractToken(text)).toBeNull();
    }
  });

  it("rejects a malformed link and a segment with odd characters", () => {
    expect(extractToken("https://")).toBeNull();
    expect(extractToken("https://all41.app/i/%E0%A4%A")).toBeNull();
    expect(extractToken("https://all41.app/i/abc%2Fdef%2Fghijkl")).toBeNull();
    expect(extractToken(`https://all41.app/i/${"a".repeat(201)}`)).toBeNull();
  });

  it("takes only the last segment, so a longer path is not a pass for another guest", () => {
    expect(extractToken(`https://all41.app/i/${token}/photos`)).toBeNull();
  });
});
