import { FORMAT_MIME, MAX_PHOTO_BYTES, type PhotoFormat } from "./limits";

/** The part of a canvas the encoder needs, so it can be tested without a browser. */
export interface Encodable {
  width: number;
  height: number;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
}

export interface Encoded {
  blob: Blob;
  format: PhotoFormat;
}

const toBlob = (canvas: Encodable, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** Tried in order; the first that fits wins. Photos of people stay good down to about 0.5. */
export const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.6, 0.5, 0.4];

/** How much smaller each retry draws the picture when even the lowest quality is too big. */
const SHRINK = 0.8;
const MAX_SHRINKS = 5;

/**
 * Converts a canvas to WebP, or JPEG where the browser cannot encode WebP
 * (it then hands back a PNG, which is how we notice), and keeps lowering the
 * quality, then the size, until the file fits in `maxBytes`.
 *
 * `shrink` draws the canvas again smaller; it is only called when quality alone
 * is not enough, which a 1600 pixel picture of a crowd almost never needs.
 */
export async function encodeUnderLimit(
  canvas: Encodable,
  shrink: (canvas: Encodable, factor: number) => Encodable,
  maxBytes = MAX_PHOTO_BYTES,
): Promise<Encoded | null> {
  let format: PhotoFormat = "webp";
  let current = canvas;

  for (let attempt = 0; attempt <= MAX_SHRINKS; attempt++) {
    for (const quality of QUALITY_STEPS) {
      let blob = await toBlob(current, FORMAT_MIME[format], quality);
      if (blob && format === "webp" && blob.type !== FORMAT_MIME.webp) {
        // This browser cannot write WebP. JPEG is the fallback the spec allows.
        format = "jpg";
        blob = await toBlob(current, FORMAT_MIME.jpg, quality);
      }
      if (!blob || blob.type !== FORMAT_MIME[format]) return null;
      if (blob.size <= maxBytes) return { blob, format };
    }
    current = shrink(current, SHRINK);
  }
  return null;
}
