import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QrCode } from "@/components/qr/qr-code";
import { WallScreen } from "@/components/photos/wall-screen";
import { getWallFeed } from "@/lib/photos/wall";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Photo wall",
  // The wall key is in the address: keep the page out of search results and the address out of referrers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const instant = true;

type Props = PageProps<"/wall/[slug]/[key]">;

export default function WallPage(props: Props) {
  return (
    <Suspense fallback={<WallSkeleton />}>
      <Wall params={props.params} />
    </Suspense>
  );
}

function WallSkeleton() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-ink" aria-hidden="true">
      <div className="space-y-[1vmin] px-[3vmin] pt-[2.6vmin]">
        <div className="h-[1.7vmin] w-[12vmin] animate-pulse rounded-full bg-panel-raised" />
        <div className="h-[4.6vmin] w-[50vmin] animate-pulse rounded-2xl bg-panel-raised" />
      </div>
      <div className="p-[2.4vmin] pt-[2vmin]">
        <div className="h-[80dvh] animate-pulse rounded-[2rem] bg-panel" />
      </div>
    </main>
  );
}

async function Wall({ params }: { params: Props["params"] }) {
  const { slug, key } = await params;
  const feed = await getWallFeed(slug, key);
  if (!feed) notFound();
  const eventUrl = `${SITE_URL}/e/${feed.event.slug}`;

  return (
    <WallScreen
      slug={feed.event.slug}
      wallKey={key}
      eventName={feed.event.name}
      theme={feed.event.theme}
      initial={{ enabled: feed.enabled, total: feed.total, photos: feed.photos }}
      eventUrl={eventUrl}
      qr={<QrCode value={eventUrl} size={256} label={`QR code of the page of ${feed.event.name}`} />}
    />
  );
}
