// Browser-only: turns what the camera or the gallery gave us into the picture
// that is uploaded. The geometry, filters and encoder it uses are tested apart
// from the canvas.
import { applyFilter, type PhotoFilterId } from "./filters";
import { cropToAspect, fitWithin, frameLayout, photoSizeForFrame, type Size } from "./layout";

/** Everything is first brought down to this size, so a 48 megapixel phone photo does not fill the memory. */
export const SOURCE_MAX_EDGE = 2000;

/** The longest edge of the picture that is uploaded, frame included. */
export const UPLOAD_MAX_EDGE = 1600;

function newCanvas({ width, height }: Size): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot draw pictures.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

/** Copies an image source onto a canvas of at most SOURCE_MAX_EDGE, optionally mirrored like a selfie preview. */
function toSourceCanvas(image: CanvasImageSource, natural: Size, mirror = false): HTMLCanvasElement {
  const size = fitWithin(natural, SOURCE_MAX_EDGE);
  const canvas = newCanvas(size);
  const context = context2d(canvas);
  if (mirror) {
    context.translate(size.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

/** Takes a still from the live camera. Front camera stills are mirrored, as the preview was. */
export function canvasFromVideo(video: HTMLVideoElement, mirror: boolean): HTMLCanvasElement {
  return toSourceCanvas(video, { width: video.videoWidth, height: video.videoHeight }, mirror);
}

/** Reads a photo picked from the gallery, turned upright as its metadata says. */
export async function canvasFromFile(file: File): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const canvas = toSourceCanvas(bitmap, { width: bitmap.width, height: bitmap.height });
      bitmap.close();
      return canvas;
    } catch {
      // fall through to the image element, which every browser can decode
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return toSourceCanvas(image, { width: image.naturalWidth, height: image.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface FrameDecor {
  background: string;
  accent: string;
  text: string;
  muted: string;
  title: string;
  subtitle: string;
  /** CSS font-family for the title. */
  fontFamily: string;
}

export interface DrawOptions {
  filter: PhotoFilterId;
  /** Null for no frame. */
  frame: FrameDecor | null;
  maxEdge: number;
}

/** Shrinks a piece of text until it fits the width, returns the font size used. */
function fitText(context: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, maxWidth: number) {
  let current = size;
  context.font = `${weight} ${current}px ${family}`;
  while (context.measureText(text).width > maxWidth && current > 8) {
    current -= 1;
    context.font = `${weight} ${current}px ${family}`;
  }
  return current;
}

/** Draws the finished picture: the photo cropped to a sensible shape, filtered, and in the event frame. */
export function drawPhoto(source: HTMLCanvasElement, { filter, frame, maxEdge }: DrawOptions): HTMLCanvasElement {
  const crop = cropToAspect(source);
  const photoSize = frame ? photoSizeForFrame(crop, maxEdge, { caption: true }) : fitWithin(crop, maxEdge);

  const photo = newCanvas(photoSize);
  const photoContext = context2d(photo);
  photoContext.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, photoSize.width, photoSize.height);
  if (filter !== "none") {
    const pixels = photoContext.getImageData(0, 0, photoSize.width, photoSize.height);
    applyFilter(pixels.data, filter);
    photoContext.putImageData(pixels, 0, 0);
  }
  if (!frame) return photo;

  const layout = frameLayout(photoSize, { caption: true });
  const output = newCanvas(layout.canvas);
  const context = context2d(output);
  context.fillStyle = frame.background;
  context.fillRect(0, 0, layout.canvas.width, layout.canvas.height);

  // a thin accent line just inside the edge, like the gold border of the camera in the brand kit
  const inset = layout.photo.x / 2;
  context.strokeStyle = frame.accent;
  context.lineWidth = layout.rule;
  context.strokeRect(inset, inset, layout.canvas.width - inset * 2, layout.canvas.height - inset * 2);

  context.drawImage(photo, layout.photo.x, layout.photo.y);

  if (layout.caption) {
    const { x, y, width, height } = layout.caption;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const maxWidth = width * 0.92;
    const titleSize = fitText(context, frame.title, "700", frame.fontFamily, height * 0.42, maxWidth);
    context.fillStyle = frame.text;
    context.fillText(frame.title, x + width / 2, y + height * 0.38);
    const subtitleSize = fitText(context, frame.subtitle, "600", "system-ui, sans-serif", Math.min(titleSize * 0.62, height * 0.28), maxWidth);
    context.fillStyle = frame.accent;
    context.fillText(frame.subtitle, x + width / 2, y + height * 0.38 + titleSize * 0.78 + subtitleSize * 0.2);
  }
  return output;
}

/** Draws a canvas again at a fraction of its size, for the encoder when quality alone cannot reach the size limit. */
export function shrinkCanvas(canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const size = { width: Math.max(1, Math.round(canvas.width * factor)), height: Math.max(1, Math.round(canvas.height * factor)) };
  const smaller = newCanvas(size);
  context2d(smaller).drawImage(canvas, 0, 0, size.width, size.height);
  return smaller;
}
