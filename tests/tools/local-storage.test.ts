import { describe, expect, it } from "vitest";
import { parseMultipart } from "../../tools/local-stack/storage.mjs";

type Part = { name: string; filename: string | null; contentType: string | null; data: Buffer };

/** A body shaped like the one supabase-js sends for a Blob: a cacheControl field, then the file as an unnamed part. */
function body(boundary: string, file: Buffer, type = "image/webp") {
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="cacheControl"\r\n\r\n3600\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name=""; filename="blob"\r\nContent-Type: ${type}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}

describe("the local Storage fake reads uploads", () => {
  it("splits a supabase-js form into its field and its file", () => {
    const file = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x0d, 0x0a, 0x2d, 0x2d, 0x00, 0xff]);
    const parts: Part[] = parseMultipart(body("----boundary123", file), "----boundary123");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ name: "cacheControl", filename: null });
    expect(parts[0].data.toString()).toBe("3600");
    expect(parts[1]).toMatchObject({ name: "", filename: "blob", contentType: "image/webp" });
    expect(parts[1].data.equals(file)).toBe(true);
  });

  it("keeps binary bytes that look like line breaks inside the file", () => {
    const file = Buffer.concat([Buffer.from("\r\n\r\n"), Buffer.alloc(1000, 0x2d), Buffer.from("\r\n")]);
    const parts: Part[] = parseMultipart(body("b0und", file, "image/jpeg"), "b0und");
    expect(parts[1].contentType).toBe("image/jpeg");
    expect(parts[1].data.equals(file)).toBe(true);
  });

  it("returns nothing for a body without parts", () => {
    expect(parseMultipart(Buffer.from("not a form"), "x")).toEqual([]);
  });
});
