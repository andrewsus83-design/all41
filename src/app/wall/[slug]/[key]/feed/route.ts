import { NextResponse } from "next/server";
import { getWallFeed } from "@/lib/photos/wall";

/**
 * What the big screen polls every few seconds. Public on purpose: the wall key
 * in the address is the credential. Everything in the answer is already on the
 * wall, and the short cache lets a CDN answer for many screens at once.
 */
export async function GET(_request: Request, context: RouteContext<"/wall/[slug]/[key]/feed">) {
  const { slug, key } = await context.params;
  const feed = await getWallFeed(slug, key);

  if (!feed) {
    // A wrong key, an unknown event or an unpublished one all look the same.
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      enabled: feed.enabled,
      total: feed.total,
      photos: feed.photos.map((photo) => ({ id: photo.id, path: photo.path, approvedAt: photo.approvedAt })),
    },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=5" } },
  );
}
