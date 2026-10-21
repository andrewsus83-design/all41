/**
 * The photo filters. They work on raw pixels (RGBA bytes from a canvas) rather
 * than the canvas `filter` property, which not every phone browser supports,
 * and they run the same for the preview and for the photo that is uploaded.
 */
export const PHOTO_FILTERS = [
  { id: "none", label: "Original" },
  { id: "gold", label: "Gold" },
  { id: "noir", label: "Noir" },
  { id: "neon", label: "Neon" },
] as const;

export type PhotoFilterId = (typeof PHOTO_FILTERS)[number]["id"];

export const PHOTO_FILTER_IDS = PHOTO_FILTERS.map((filter) => filter.id) as PhotoFilterId[];

interface Grade {
  /** Per-channel multipliers, applied before the offsets. */
  gain: [number, number, number];
  /** Per-channel offsets, in 0 to 255 units. */
  lift: [number, number, number];
  /** 1 keeps the colors, 0 is black and white, above 1 is more vivid. */
  saturation: number;
  /** 1 keeps the contrast; the pivot is middle gray. */
  contrast: number;
}

const GRADES: Record<Exclude<PhotoFilterId, "none">, Grade> = {
  // warm highlights and a touch of lift, like late light in a ballroom
  gold: { gain: [1.1, 1.02, 0.82], lift: [10, 4, -6], saturation: 1.12, contrast: 1.06 },
  // black and white with punchy contrast
  noir: { gain: [1, 1, 1], lift: [0, 0, 0], saturation: 0, contrast: 1.28 },
  // cool cyan cast and strong color, for the dance floor
  neon: { gain: [0.86, 1.04, 1.16], lift: [0, 4, 10], saturation: 1.38, contrast: 1.1 },
};

/** Changes the pixels in place. Alpha is left alone; values stay within 0 to 255. */
export function applyFilter(pixels: Uint8ClampedArray, filter: PhotoFilterId): void {
  if (filter === "none") return;
  const { gain, lift, saturation, contrast } = GRADES[filter];

  for (let index = 0; index < pixels.length; index += 4) {
    let red = pixels[index] * gain[0] + lift[0];
    let green = pixels[index + 1] * gain[1] + lift[1];
    let blue = pixels[index + 2] * gain[2] + lift[2];

    const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
    red = luma + (red - luma) * saturation;
    green = luma + (green - luma) * saturation;
    blue = luma + (blue - luma) * saturation;

    // The array clamps to 0..255 on write.
    pixels[index] = (red - 128) * contrast + 128;
    pixels[index + 1] = (green - 128) * contrast + 128;
    pixels[index + 2] = (blue - 128) * contrast + 128;
  }
}
