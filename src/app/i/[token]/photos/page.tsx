import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PhotoBooth } from "@/components/photos/photo-booth";
import { eventLookStyle } from "@/components/photos/event-look";
import { formatEventDay } from "@/lib/events/time";
import { getPhotoOverview, listMyPhotos } from "@/lib/photos/guest";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo wall",
  // A personal page: it is reached with the guest's own link and must not be indexed.
  robots: { index: false, follow: false },
};

export const instant = true;

type Props = PageProps<"/i/[token]/photos">;

export default function PhotosPage(props: Props) {
  return (
    <Suspense fallback={<PhotosSkeleton />}>
      <Photos params={props.params} />
    </Suspense>
  );
}

function PhotosSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-5 pt-8" aria-hidden="true">
      <div className="h-4 w-24 animate-pulse rounded-full bg-panel-raised" />
      <div className="h-9 w-3/4 animate-pulse rounded-xl bg-panel-raised" />
      <div className="h-14 animate-pulse rounded-[1.5rem] bg-panel" />
      <div className="h-14 animate-pulse rounded-[1.5rem] bg-panel" />
    </div>
  );
}

async function Photos({ params }: { params: Props["params"] }) {
  const { token } = await params;
  const overview = await getPhotoOverview(token);
  if (!overview) notFound();
  const photos = await listMyPhotos(token);

  return (
    <div className="min-h-dvh" style={eventLookStyle(overview.theme)}>
      <PhotoBooth
        token={token}
        eventName={overview.eventName}
        eventSlug={overview.eventSlug}
        firstName={overview.guestName.split(/\s+/)[0] ?? overview.guestName}
        dateLabel={formatEventDay(overview.startsAt, overview.timezone)}
        theme={overview.theme}
        enabled={overview.photosEnabled}
        uploadsOpen={overview.uploadsOpen}
        moderation={overview.moderation}
        consentedAt={overview.consentedAt}
        quota={overview.photoQuota}
        initialPhotos={photos}
        albumHref={`/i/${token}/album`}
        shareUrl={`${SITE_URL}/e/${overview.eventSlug}`}
      />
    </div>
  );
}
