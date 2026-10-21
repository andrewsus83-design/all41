import { describe, expect, it } from "vitest";
import { QUALITY_STEPS, encodeUnderLimit, type Encodable } from "./encode";
import { PHOTO_FAILURE_MESSAGES, classifyPhotoError, type PhotoFailure } from "./errors";
import { PHOTO_FILTERS, applyFilter, type PhotoFilterId } from "./filters";
import { MAX_ASPECT, MIN_ASPECT, cropToAspect, fitWithin, frameLayout, photoSizeForFrame } from "./layout";
import { MAX_PHOTO_BYTES } from "./limits";
import { photoFileName } from "./urls";

const pixels = (...rgba: number[]) => new Uint8ClampedArray(rgba);

describe("photo filters", () => {
  it("offers an original and three looks", () => {
    expect(PHOTO_FILTERS.map((filter) => filter.id)).toEqual(["none", "gold", "noir", "neon"]);
  });

  it("leave the original as it is", () => {
    const data = pixels(10, 120, 250, 255);
    applyFilter(data, "none");
    expect([...data]).toEqual([10, 120, 250, 255]);
  });

  it("make noir black and white", () => {
    const data = pixels(200, 40, 90, 255, 10, 220, 30, 128);
    applyFilter(data, "noir");
    for (const start of [0, 4]) expect(new Set([data[start], data[start + 1], data[start + 2]]).size).toBe(1);
  });

  it("warm gold up and cool neon down", () => {
    const gray = () => pixels(128, 128, 128, 255);
    const gold = gray();
    applyFilter(gold, "gold");
    expect(gold[0]).toBeGreaterThan(gold[2]);
    const neon = gray();
    applyFilter(neon, "neon");
    expect(neon[2]).toBeGreaterThan(neon[0]);
  });

  it.each(PHOTO_FILTERS.map((filter) => filter.id))("%s never leaves the byte range and keeps the alpha", (filter: PhotoFilterId) => {
    const data = pixels(0, 0, 0, 7, 255, 255, 255, 99, 255, 0, 0, 255, 0, 255, 0, 3);
    applyFilter(data, filter);
    expect([...data].every((value) => value >= 0 && value <= 255 && Number.isInteger(value))).toBe(true);
    expect([data[3], data[7], data[11], data[15]]).toEqual([7, 99, 255, 3]);
  });

  it("make every look different from the original on a colorful pixel", () => {
    const results = new Set(
      PHOTO_FILTERS.map((filter) => {
        const data = pixels(180, 90, 60, 255);
        applyFilter(data, filter.id);
        return [...data].join(",");
      }),
    );
    expect(results.size).toBe(PHOTO_FILTERS.length);
  });
});

describe("photo layout", () => {
  it("fits a big picture within the longest edge and never scales up", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("crops panoramas and tall strips to a sensible shape, centered", () => {
    expect(cropToAspect({ width: 1000, height: 800 })).toEqual({ x: 0, y: 0, width: 1000, height: 800 });
    const wide = cropToAspect({ width: 3000, height: 1000 });
    expect(wide.width / wide.height).toBe(MAX_ASPECT);
    expect(wide.x).toBe(500);
    const tall = cropToAspect({ width: 500, height: 3000 });
    expect(tall.width / tall.height).toBe(MIN_ASPECT);
    expect(tall.y).toBe(1000);
  });

  it("puts a border around the photo and a caption strip below it", () => {
    const layout = frameLayout({ width: 1000, height: 1200 }, { caption: true });
    expect(layout.photo.x).toBeGreaterThan(0);
    expect(layout.canvas.width).toBe(1000 + layout.photo.x * 2);
    expect(layout.canvas.height).toBe(1200 + layout.photo.y * 2 + (layout.caption?.height ?? 0));
    expect(layout.caption).toMatchObject({ x: layout.photo.x, y: layout.photo.y + 1200, width: 1000 });
  });

  it("has no strip without a caption", () => {
    const layout = frameLayout({ width: 1000, height: 1200 }, { caption: false });
    expect(layout.caption).toBeNull();
    expect(layout.canvas.height).toBe(1200 + layout.photo.y * 2);
  });

  it("asks for a photo small enough that the whole framed picture fits the longest edge", () => {
    for (const source of [
      { width: 4032, height: 3024 },
      { width: 3024, height: 4032 },
      { width: 1000, height: 1000 },
    ]) {
      const photo = photoSizeForFrame(source, 1600, { caption: true });
      const { canvas } = frameLayout(photo, { caption: true });
      expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(1600);
      expect(photo.width / photo.height).toBeCloseTo(source.width / source.height, 1);
    }
  });
});

/** A canvas that "encodes" to a size that grows with its area and the quality. */
function fakeCanvas(width: number, height: number, { webp = true, bytesPerPixel = 0.6 } = {}): Encodable & { calls: string[] } {
  const calls: string[] = [];
  return {
    width,
    height,
    calls,
    toBlob(callback, type = "image/png", quality = 0.92) {
      calls.push(`${type}@${quality}`);
      // a browser that cannot write WebP hands back a PNG instead
      const actual = type === "image/webp" && !webp ? "image/png" : type;
      const size = Math.floor(width * height * bytesPerPixel * quality);
      // only the size and type are read, so no bytes are allocated
      callback({ size, type: actual } as Blob);
    },
  };
}

const shrinkFake = (canvas: Encodable, factor: number) =>
  fakeCanvas(Math.round(canvas.width * factor), Math.round(canvas.height * factor));

describe("encoding a photo", () => {
  it("writes WebP at the best quality that fits", async () => {
    const canvas = fakeCanvas(1000, 1000, { bytesPerPixel: 1 });
    const result = await encodeUnderLimit(canvas, shrinkFake);
    expect(result?.format).toBe("webp");
    expect(result?.blob.type).toBe("image/webp");
    expect(result?.blob.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
    expect(canvas.calls[0]).toBe(`image/webp@${QUALITY_STEPS[0]}`);
  });

  it("steps the quality down until the file fits in the limit", async () => {
    // 3 million pixels: only the lower qualities fit in 2 MB
    const canvas = fakeCanvas(2000, 1500, { bytesPerPixel: 1 });
    const result = await encodeUnderLimit(canvas, shrinkFake);
    expect(result?.blob.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
    expect(canvas.calls.length).toBeGreaterThan(1);
    expect(canvas.calls.length).toBeLessThanOrEqual(QUALITY_STEPS.length);
  });

  it("falls back to JPEG where the browser cannot write WebP", async () => {
    const canvas = fakeCanvas(800, 600, { webp: false });
    const result = await encodeUnderLimit(canvas, shrinkFake);
    expect(result?.format).toBe("jpg");
    expect(result?.blob.type).toBe("image/jpeg");
    expect(canvas.calls).toEqual(["image/webp@0.86", "image/jpeg@0.86"]);
  });

  it("makes the picture smaller when quality alone is not enough", async () => {
    const canvas = fakeCanvas(4000, 3000, { bytesPerPixel: 1 });
    let shrinks = 0;
    const result = await encodeUnderLimit(canvas, (c, factor) => {
      shrinks += 1;
      return shrinkFake(c, factor);
    });
    expect(shrinks).toBeGreaterThan(0);
    expect(result?.blob.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
  });

  it("gives up with nothing rather than a file over the limit", async () => {
    const canvas = fakeCanvas(8000, 8000, { bytesPerPixel: 50 });
    expect(await encodeUnderLimit(canvas, (c) => fakeCanvas(c.width, c.height, { bytesPerPixel: 50 }))).toBeNull();
  });
});

describe("photo failures", () => {
  it("are read from the rule name the database raises", () => {
    expect(classifyPhotoError({ code: "23514", message: "photo_limit_reached" })).toBe("photo_limit_reached");
    expect(classifyPhotoError({ code: "P0002", message: "invitation_not_found" })).toBe("invitation_not_found");
    expect(classifyPhotoError({ code: "42501", message: "forbidden" })).toBe("forbidden");
  });

  it("are unknown for anything else, and never repeat the database's own words", () => {
    expect(classifyPhotoError({ code: "XX000", message: "relation a41_photos does not exist" })).toBe("unknown");
    expect(classifyPhotoError({})).toBe("unknown");
  });

  it("each have a plain message", () => {
    for (const failure of Object.keys(PHOTO_FAILURE_MESSAGES) as PhotoFailure[]) {
      expect(PHOTO_FAILURE_MESSAGES[failure].length).toBeGreaterThan(10);
    }
  });
});

describe("downloaded photo names", () => {
  it("carry the event, the day and a short id", () => {
    expect(photoFileName("annual-gala", "2026-10-21T08:21:23+00:00", "0f0e/12345678-aaaa.webp")).toBe("annual-gala-2026-10-21-12345678.webp");
    expect(photoFileName("annual-gala", "2026-10-21T08:21:23+00:00", "0f0e/abcdef12-aaaa.jpg")).toBe("annual-gala-2026-10-21-abcdef12.jpg");
  });
});
