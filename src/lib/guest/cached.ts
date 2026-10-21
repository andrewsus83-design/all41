import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getPublicEvent } from "./public";
import type { PublicEvent } from "./records";

/** The cache tag of one event's public page. Publishing and unpublishing expire it. */
export const publicEventTag = (slug: string) => `public-event:${slug}`;

/**
 * The public page of an event, shared by every visitor, so it is cached for a
 * short while: a venue full of guests opening the page reads the database once
 * a minute, not once each. Publishing or unpublishing expires it at once; an edit
 * to the event shows up within a couple of minutes.
 */
export async function getCachedPublicEvent(slug: string): Promise<PublicEvent | null> {
  "use cache";
  cacheTag(publicEventTag(slug));
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  return getPublicEvent(slug);
}
