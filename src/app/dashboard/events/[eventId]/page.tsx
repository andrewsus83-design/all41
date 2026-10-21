import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CapacityMeter } from "@/components/events/capacity-meter";
import { capacityOf } from "@/lib/events/capacity";
import { getEvent, getWorkspace, guestStatusCounts } from "@/lib/events/queries";
import { GUEST_STATUSES, GUEST_STATUS_LABELS } from "@/lib/events/records";
import { THEME_FONTS, THEME_PRESETS, resolveAccent } from "@/lib/events/theme";
import { eventUrl } from "@/lib/guest/links";
import { TIMEZONES } from "@/lib/events/time";
import { CONTACT_EMAIL } from "@/lib/site";
import { getPackage } from "@/lib/pricing";
import { PublishCard } from "./publish-card";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage(props: PageProps<"/dashboard/events/[eventId]">) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
      <Overview params={props.params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: PageProps<"/dashboard/events/[eventId]">["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [counts, workspace] = await Promise.all([guestStatusCounts(eventId), getWorkspace()]);
  const used = GUEST_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const capacity = capacityOf(event, used);
  const base = `/dashboard/events/${event.id}`;
  const canEdit = workspace?.role === "owner";
  const pkg = getPackage(event.package);
  const accent = resolveAccent(event.theme);
  const zone = TIMEZONES.find((candidate) => candidate.id === event.timezone)?.label ?? event.timezone;
  const publicLink = eventUrl(event.slug);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <PublishCard eventId={event.id} status={event.status} link={publicLink} canPublish={canEdit} />

        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Guest list</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={`${base}/guests`} className={buttonStyles({ variant: "secondary" })}>
                View guests
              </Link>
              {canEdit && (
                <Link href={`${base}/guests/import`} className={buttonStyles()}>
                  Import guests
                </Link>
              )}
            </div>
          </div>

          <CapacityMeter capacity={capacity} />

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {GUEST_STATUSES.map((status) => (
              <div key={status} className="rounded-2xl border border-line bg-ink px-4 py-3">
                <dd className="font-display text-2xl font-semibold tabular-nums">{counts[status].toLocaleString("en-US")}</dd>
                <dt className="text-sm text-muted">{GUEST_STATUS_LABELS[status]}</dt>
              </div>
            ))}
          </dl>
        </Card>

        {event.package === "free" && (
          <Card className="space-y-2 border-gold/30 p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold">Room for more guests</h2>
            <p className="text-muted">
              A Free event holds {pkg.guestCapacity} guests, which is enough to try everything out. To invite your real guest list, this
              event needs a package. Online checkout is on its way; until then write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Package%20for%20${encodeURIComponent(event.name)}`} className="text-gold underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will switch it on for you.
            </p>
          </Card>
        )}
      </div>

      <Card className="h-fit space-y-5 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Details</h2>
          {canEdit && (
            <Link href={`${base}/settings`} className="text-sm text-gold underline">
              Edit
            </Link>
          )}
        </div>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted">Venue</dt>
            <dd>{event.venueName ?? <span className="text-muted">Not set</span>}</dd>
            {event.venueAddress && <dd className="whitespace-pre-line text-muted">{event.venueAddress}</dd>}
          </div>
          <div>
            <dt className="text-muted">Event address</dt>
            <dd className="break-all">{publicLink.replace(/^https?:\/\//, "")}</dd>
          </div>
          <div>
            <dt className="text-muted">Time zone</dt>
            <dd>{zone}</dd>
          </div>
          <div>
            <dt className="text-muted">Package</dt>
            <dd>
              {pkg.name}, up to {capacity.total.toLocaleString("en-US")} guests
            </dd>
          </div>
          <div>
            <dt className="text-muted">Theme</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span aria-hidden="true" className="size-4 rounded-full border border-line" style={{ background: accent }} />
              <Badge>{THEME_PRESETS[event.theme.preset].name}</Badge>
              <Badge>{THEME_FONTS[event.theme.font].name}</Badge>
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
