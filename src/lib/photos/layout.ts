/** Geometry of a photo and its frame, kept free of the canvas so it can be tested. */

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

/** The largest size with the same shape as `size` whose longer side is at most `maxEdge`. Never scales up. */
export function fitWithin(size: Size, maxEdge: number): Size {
  const longest = Math.max(size.width, size.height);
  if (longest <= maxEdge) return { width: Math.round(size.width), height: Math.round(size.height) };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** A photo is never taller than 2 to 1 or wider than 1 to 2, so a panorama does not make a sliver. */
export const MIN_ASPECT = 0.5;
export const MAX_ASPECT = 2;

/** The part of a source of the given size to keep: centered, within the allowed shapes. */
export function cropToAspect(source: Size): Rect {
  const aspect = source.width / source.height;
  if (aspect > MAX_ASPECT) {
    const width = Math.round(source.height * MAX_ASPECT);
    return { x: Math.round((source.width - width) / 2), y: 0, width, height: source.height };
  }
  if (aspect < MIN_ASPECT) {
    const height = Math.round(source.width / MIN_ASPECT);
    return { x: 0, y: Math.round((source.height - height) / 2), width: source.width, height };
  }
  return { x: 0, y: 0, width: source.width, height: source.height };
}

export interface FrameLayout {
  /** The whole picture, frame included. */
  canvas: Size;
  /** Where the photo goes inside it. */
  photo: Rect;
  /** The strip under the photo that holds the event name; null without a caption. */
  caption: Rect | null;
  /** Width of the colored line drawn just inside the edge. */
  rule: number;
}

/**
 * Lays out a photo of `photo` size with a border all around and, optionally, a
 * caption strip below. Everything scales with the photo's shorter side.
 */
export function frameLayout(photo: Size, { caption }: { caption: boolean }): FrameLayout {
  const short = Math.min(photo.width, photo.height);
  const margin = Math.round(short * 0.04);
  const strip = caption ? Math.round(short * 0.13) : 0;
  return {
    canvas: { width: photo.width + margin * 2, height: photo.height + margin * 2 + strip },
    photo: { x: margin, y: margin, width: photo.width, height: photo.height },
    caption: caption ? { x: margin, y: margin + photo.height, width: photo.width, height: strip } : null,
    rule: Math.max(2, Math.round(short * 0.008)),
  };
}

/** The photo size to ask for so that, with its frame, the picture stays within `maxEdge`. */
export function photoSizeForFrame(source: Size, maxEdge: number, { caption }: { caption: boolean }): Size {
  // First pass on the frame's own size, then shrink so the frame fits too.
  const probe = frameLayout(fitWithin(source, maxEdge), { caption });
  const longest = Math.max(probe.canvas.width, probe.canvas.height);
  if (longest <= maxEdge) return fitWithin(source, maxEdge);
  return fitWithin(source, Math.floor((maxEdge * maxEdge) / longest));
}
