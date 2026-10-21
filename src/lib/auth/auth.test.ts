import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, emailSchema, signInSchema, signUpSchema } from "./credentials";
import { resolveOrigin } from "./origin";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/events/42", "/dashboard/events/42"],
    ["/dashboard?tab=guests", "/dashboard?tab=guests"],
    ["/dashboard#top", "/dashboard#top"],
  ])("keeps the site path %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([null, undefined, ""])("falls back for %j", (next) => {
    expect(safeNextPath(next)).toBe("/dashboard");
  });

  it.each([
    ["another site", "https://evil.example/dashboard"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash that browsers read as a slash", "/\\evil.example"],
    ["a tab that browsers strip from the URL", "/\t/evil.example"],
    ["a newline that browsers strip from the URL", "/\n/evil.example"],
    ["a path without a leading slash", "dashboard"],
    ["a javascript URL", "javascript:alert(1)"],
  ])("rejects %s", (_label, next) => {
    expect(safeNextPath(next)).toBe("/dashboard");
  });

  it.each(["/login", "/login?next=/dashboard", "/signup", "/auth/callback", "/auth/callback?code=1"])(
    "never sends someone back to the auth page %s",
    (next) => {
      expect(safeNextPath(next)).toBe("/dashboard");
    },
  );

  it("does not mistake a longer path for an auth page", () => {
    expect(safeNextPath("/loginfo")).toBe("/loginfo");
    expect(safeNextPath("/authors")).toBe("/authors");
  });

  it("uses the fallback it is given", () => {
    expect(safeNextPath("//evil.example", "/")).toBe("/");
  });
});

describe("credentials", () => {
  it("trims and lowercases the email", () => {
    expect(emailSchema.parse("  Alex@Example.COM ")).toBe("alex@example.com");
  });

  it.each(["", "alex", "alex@", "@example.com", "alex@example", `${"a".repeat(250)}@example.com`])(
    "rejects the email %j",
    (email) => {
      expect(emailSchema.safeParse(email).success).toBe(false);
    },
  );

  it("accepts any non-empty password at sign-in, so older accounts still work", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("holds new passwords to the minimum length", () => {
    const attempt = (password: string) => signUpSchema.safeParse({ email: "a@b.co", password }).success;
    expect(attempt("x".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false);
    expect(attempt("x".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
  });

  it("limits new passwords to 72 bytes, which is all bcrypt reads", () => {
    const attempt = (password: string) => signUpSchema.safeParse({ email: "a@b.co", password }).success;
    expect(attempt("x".repeat(72))).toBe(true);
    expect(attempt("x".repeat(73))).toBe(false);
    // 40 two-byte characters is only 40 characters but 80 bytes.
    expect(attempt("é".repeat(40))).toBe(false);
  });
});

describe("resolveOrigin", () => {
  const fallback = "https://all41.app";
  const none = { host: null, forwardedHost: null, forwardedProto: null, fallback };

  it("uses the forwarded host and protocol behind Vercel", () => {
    expect(
      resolveOrigin({ ...none, host: "internal", forwardedHost: "all41.app", forwardedProto: "https" }),
    ).toBe("https://all41.app");
  });

  it("takes the first value of a forwarded list", () => {
    expect(resolveOrigin({ ...none, forwardedHost: "all41.app, proxy.internal", forwardedProto: "https, http" })).toBe(
      "https://all41.app",
    );
  });

  it("uses http for localhost and https everywhere else by default", () => {
    expect(resolveOrigin({ ...none, host: "localhost:3000" })).toBe("http://localhost:3000");
    expect(resolveOrigin({ ...none, host: "all41-git-preview.vercel.app" })).toBe(
      "https://all41-git-preview.vercel.app",
    );
  });

  it("falls back when there is no host or it looks wrong", () => {
    expect(resolveOrigin(none)).toBe(fallback);
    expect(resolveOrigin({ ...none, host: "evil.example/path" })).toBe(fallback);
    expect(resolveOrigin({ ...none, host: "evil.example@attacker.example" })).toBe(fallback);
    expect(resolveOrigin({ ...none, host: "a b" })).toBe(fallback);
  });
});
