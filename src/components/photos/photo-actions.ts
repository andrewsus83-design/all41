import { photoUrl } from "@/lib/photos/urls";

/** How a share ended: through the phone's share sheet, by copying the album link, or not at all. */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/**
 * Shares a photo with the phone's share sheet, so it can go to Instagram,
 * WhatsApp, TikTok and the rest. Where the browser can share files the photo
 * itself goes; where it can only share links the album link goes; elsewhere
 * the link is copied.
 */
export async function sharePhoto(path: string, fileName: string, title: string, fallbackUrl: string): Promise<ShareResult> {
  try {
    if (navigator.share) {
      try {
        const response = await fetch(photoUrl(path));
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: blob.type });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title });
            return "shared";
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return "cancelled";
        // fall through to sharing the link
      }
      await navigator.share({ title, url: fallbackUrl });
      return "shared";
    }
    await navigator.clipboard.writeText(fallbackUrl);
    return "copied";
  } catch (error) {
    return (error as Error).name === "AbortError" ? "cancelled" : "failed";
  }
}
