// What the big screen shows and in which order. Pure functions on purpose: the
// screen polls the feed every few seconds and these decide, from each answer,
// which photo comes next. Photos are listed newest first, as the feed sends them.

export interface WallPhoto {
  id: string;
  path: string;
  approvedAt: string;
}

/** The slim answer of the feed route, which is all the screen needs. */
export interface WallPoll {
  enabled: boolean;
  total: number;
  photos: WallPhoto[];
}

export interface WallState {
  /** Newest first. */
  photos: WallPhoto[];
  /** Every id the screen has seen, so only really new photos jump the queue. */
  seen: ReadonlySet<string>;
  /** New photos not shown yet, in the order they were approved. */
  fresh: readonly string[];
  /** The photo in the spotlight, or null while there is none. */
  currentId: string | null;
}

export const EMPTY_WALL: WallState = { photos: [], seen: new Set(), fresh: [], currentId: null };

/** How long a photo stays in the spotlight, and how long before a new one may replace it. */
export const WALL_DWELL_MS = 8000;
export const WALL_MIN_DWELL_MS = 4000;
/** How often the screen asks for news. */
export const WALL_POLL_MS = 4000;
/** The most photos the mosaic beside the spotlight shows. */
export const WALL_MOSAIC_SIZE = 12;

/** The next photo after `currentId`: the next older one, and the newest again after the oldest. */
function following(photos: readonly WallPhoto[], currentId: string | null): string | null {
  if (photos.length === 0) return null;
  const index = photos.findIndex((photo) => photo.id === currentId);
  return photos[(index + 1) % photos.length]!.id;
}

/** Moves the spotlight on: a new photo first, otherwise round the album. */
export function advance(state: WallState): WallState {
  const [next, ...rest] = state.fresh;
  if (next !== undefined) return { ...state, currentId: next, fresh: rest };
  return { ...state, currentId: following(state.photos, state.currentId) };
}

/** Takes in a fresh answer from the feed. */
export function applyFeed(state: WallState, incoming: readonly WallPhoto[]): WallState {
  const photos = [...incoming];
  const ids = new Set(photos.map((photo) => photo.id));
  const firstLook = state.seen.size === 0;

  // New photos, oldest first, so they appear in the order they were approved.
  const arrived = firstLook ? [] : photos.filter((photo) => !state.seen.has(photo.id)).map((photo) => photo.id).reverse();
  const seen = new Set([...state.seen, ...ids]);
  const fresh = [...state.fresh.filter((id) => ids.has(id)), ...arrived];

  const next: WallState = { photos, seen, fresh, currentId: state.currentId };
  // The first answer starts at the newest photo; a spotlight photo that was
  // taken down is replaced at once.
  if (state.currentId === null) return photos[0] ? { ...next, currentId: photos[0].id } : next;
  return ids.has(state.currentId) ? next : advance(next);
}

/** The photos of the mosaic: the newest ones. */
export function mosaicOf(photos: readonly WallPhoto[]): WallPhoto[] {
  return photos.slice(0, WALL_MOSAIC_SIZE);
}

/** Fewer photos than this and the spotlight and the QR code are all the screen needs. */
export const WALL_MOSAIC_MIN = 4;

/**
 * Columns and rows for the mosaic, so a few photos fill the space as well as
 * many do, and how many columns the last photo takes so no cell stays empty.
 */
export function mosaicGrid(count: number): { columns: number; rows: number; lastSpan: number } {
  const columns = count <= 8 ? 2 : 3;
  return { columns, rows: Math.max(1, Math.ceil(count / columns)), lastSpan: columns - ((count - 1) % columns) };
}

/** Reads the feed route's JSON. Null for anything that is not a feed. */
export function parseWallPoll(value: unknown): WallPoll | null {
  if (typeof value !== "object" || value === null) return null;
  const { enabled, total, photos } = value as Record<string, unknown>;
  if (typeof enabled !== "boolean" || typeof total !== "number" || !Array.isArray(photos)) return null;
  const list: WallPhoto[] = [];
  for (const photo of photos) {
    if (typeof photo !== "object" || photo === null) return null;
    const { id, path, approvedAt } = photo as Record<string, unknown>;
    if (typeof id !== "string" || typeof path !== "string" || typeof approvedAt !== "string") return null;
    list.push({ id, path, approvedAt });
  }
  return { enabled, total, photos: list };
}
