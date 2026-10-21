import { SITE_URL } from "@/lib/site";

/** The link the big screen shows as a QR: guests land on a page that finds their own invitation. */
export const joinUrl = (playKey: string) => `${SITE_URL}/play/${playKey}`;

/**
 * What a mission's printed QR holds. It is a link, so a phone's own camera app can open it,
 * and it ends with the code, so the in-app scanner takes the code from the last segment.
 */
export const missionUrl = (playKey: string, code: string) => `${SITE_URL}/hunt/${playKey}/${code}`;

export const normalizeMissionCode = (text: string) => text.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/**
 * Takes the mission code out of whatever a scanner or a person produced: a mission link, a bare code
 * (typed with spaces or dashes, in any case) or nothing sensible, which gives null.
 */
export function extractMissionCode(scanned: string): string | null {
  const text = scanned.trim();
  if (!text) return null;
  let candidate = text;
  try {
    const url = new URL(text);
    candidate = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    // not a link: treat the whole text as the code
  }
  const code = normalizeMissionCode(candidate);
  return /^[A-Z0-9]{6,24}$/.test(code) ? code : null;
}
