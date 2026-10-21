import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlbumGrid } from "@/components/photos/album-grid";
import { eventLookStyle } from "@/components/photos/event-look";
import { formatEventDay } from "@/lib/events/time";
import { ALBUM_PAGE_SIZE, getPhotoOverview, listAlbum } from "@/lib/photos/guest";
import { PHOTO_RETENTION_DAYS } from "@/lib/photos/limits";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo album",
  robots: { index: false, follow: false },
};

export const instant = true;

type Props = PageProps<"/i/[token]/album">;

export default function AlbumPage(props: Props) {
  return (
    <Suspense fallback={<AlbumSkeleton />}>
      <Album params={props.params} />
    </Suspense>
  );
}

function AlbumSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 pt-8" aria-hidden="true">
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-panel-raised" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-2xl bg-panel" />
        ))}
      </div>
    </div>
  );
}

async function Album({ params }: { params: Props["params"] }) {
  const { token } = await params;
  const overview = await getPhotoOverview(token);
  if (!overview) notFound();
  const photos = overview.photosEnabled ? await listAlbum(token) : [];

  return (
    <div className="min-h-dvh" style={eventLookStyle(overview.theme)}>
      <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-20">
        <header className="mb-6 space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--ev-accent)" }}>
            Shared album
          </p>
          <h1 className="text-3xl leading-tight font-semibold break-words" style={{ fontFamily: "var(--ev-heading)" }}>
            {overview.eventName}
          </h1>
          <p className="text-sm" style={{ color: "var(--ev-muted)" }}>
            {formatEventDay(overview.startsAt, overview.timezone)}
          </p>
          <p style={{ color: "var(--ev-muted)" }}>
            Photos from everyone at the event. Photos are deleted {PHOTO_RETENTION_DAYS} days after they are taken, so download your favorites.
          </p>
          <Link href={`/i/${token}/photos`} className="inline-block text-sm font-bold underline-offset-4 hover:underline" style={{ color: "var(--ev-accent)" }}>
            Back to my photos
          </Link>
        </header>

        {!overview.photosEnabled ? (
          <p className="rounded-[2rem] border border-dashed border-white/15 p-8 text-center" style={{ color: "var(--ev-muted)" }}>
            The photo wall is not open for this event.
          </p>
        ) : photos.length === 0 ? (
          <p className="rounded-[2rem] border border-dashed border-white/15 p-8 text-center" style={{ color: "var(--ev-muted)" }}>
            No photos here yet. Photos appear once they are approved.
          </p>
        ) : (
          <AlbumGrid
            token={token}
            eventSlug={overview.eventSlug}
            eventName={overview.eventName}
            shareUrl={`${SITE_URL}/e/${overview.eventSlug}`}
            initialPhotos={photos}
            initialHasMore={photos.length === ALBUM_PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}
