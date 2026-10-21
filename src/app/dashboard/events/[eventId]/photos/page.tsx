import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { MODERATION_PAGE_SIZE, getPhotoSettings, getPhotoStats, listEventPhotos } from "@/lib/photos/dashboard";
import { formatBytes, wallAddress } from "@/lib/photos/format";
import { PHOTO_RETENTION_DAYS } from "@/lib/photos/limits";
import { SITE_URL } from "@/lib/site";
import { ApproveAllButton } from "./approve-all-button";
import { AutoRefresh } from "./auto-refresh";
import { ModerationGrid } from "./moderation-grid";
import { PhotoSettingsForm } from "./settings-form";
import { WallLink } from "./wall-link";

export const metadata: Metadata = { title: "Photos" };

type Props = PageProps<"/dashboard/events/[eventId]/photos">;

const TABS = [
  { id: "pending", label: "Waiting" },
  { id: "approved", label: "On the wall" },
  { id: "rejected", label: "Hidden" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const isTab = (value: unknown): value is TabId => TABS.some((tab) => tab.id === value);

export default function PhotosPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
      <Photos params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Photos({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [workspace, settings, stats] = await Promise.all([getWorkspace(), getPhotoSettings(eventId), getPhotoStats(eventId)]);
  if (!settings) {
    return <Card className="p-8 text-muted">Photos are not set up for this event yet.</Card>;
  }

  const canEdit = workspace?.role === "owner";
  const counts = { pending: stats.pending, approved: stats.approved, rejected: stats.rejected };
  // Open on the photos that need a decision, or on the wall when nothing waits.
  const tab: TabId = isTab(query.status) ? query.status : stats.pending > 0 ? "pending" : "approved";
  const requested = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const list = await listEventPhotos(eventId, tab, page);

  const base = `/dashboard/events/${eventId}/photos`;
  const hrefFor = (status: TabId, to = 1) => `${base}?status=${status}${to > 1 ? `&page=${to}` : ""}`;
  const pages = Math.max(1, Math.ceil(list.total / MODERATION_PAGE_SIZE));
  const address = wallAddress(SITE_URL, event.slug, settings.wallKey);

  return (
    <div className="space-y-8">
      {settings.enabled && <AutoRefresh everyMs={10_000} />}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for approval" value={stats.pending.toLocaleString("en-US")} highlight={stats.pending > 0} />
        <Stat label="On the wall" value={stats.approved.toLocaleString("en-US")} />
        <Stat label="Hidden" value={stats.rejected.toLocaleString("en-US")} />
        <Stat label="Storage used" value={formatBytes(stats.storedBytes)} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Photo wall</h2>
          <PhotoSettingsForm eventId={eventId} enabled={settings.enabled} moderation={settings.moderation} canEdit={canEdit} />
        </Card>

        <Card className="space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Big screen</h2>
          {event.status !== "published" && (
            <p className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              The wall and the guests&rsquo; photo pages open once the event is published.
            </p>
          )}
          {!settings.enabled && (
            <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">The wall shows a waiting screen until you switch the photo wall on.</p>
          )}
          <WallLink eventId={eventId} address={address} canEdit={canEdit} />
          <p className="border-t border-line pt-4 text-sm text-muted">
            {stats.consents.toLocaleString("en-US")} {stats.consents === 1 ? "guest has" : "guests have"} agreed to the photo notice. Photos are deleted{" "}
            {PHOTO_RETENTION_DAYS} days after they are taken.
          </p>
        </Card>
      </div>

      <section className="space-y-5" aria-labelledby="moderation-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="moderation-heading" className="font-display text-xl font-semibold">
            Photos
          </h2>
          {canEdit && tab === "pending" && stats.pending > 0 && <ApproveAllButton eventId={eventId} count={stats.pending} />}
        </div>

        <nav aria-label="Photo status" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2">
            {TABS.map((item) => (
              <li key={item.id}>
                <Link
                  href={hrefFor(item.id)}
                  aria-current={item.id === tab ? "page" : undefined}
                  className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-colors ${
                    item.id === tab ? "border-gold bg-gold/10 text-gold" : "border-line text-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  {item.label}
                  <span className="tabular-nums">{counts[item.id].toLocaleString("en-US")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {!canEdit && <p className="text-sm text-muted">Only an owner of the organization can approve, hide or delete photos.</p>}

        {list.photos.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            {page > 1 ? (
              <p>
                That page does not exist.{" "}
                <Link href={hrefFor(tab)} className="text-gold underline">
                  Back to the first page
                </Link>
              </p>
            ) : tab === "pending" ? (
              <p>Nothing is waiting. New photos show up here by themselves.</p>
            ) : tab === "approved" ? (
              <p>No photos on the wall yet.</p>
            ) : (
              <p>No hidden photos.</p>
            )}
          </Card>
        ) : (
          <ModerationGrid key={`${tab}-${page}`} eventId={eventId} tab={tab} photos={list.photos} canModerate={canEdit} timezone={event.timezone} />
        )}

        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-muted">
            <p>
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={hrefFor(tab, page - 1)} className={buttonStyles({ variant: "secondary" })}>
                  Previous
                </Link>
              )}
              {page < pages && (
                <Link href={hrefFor(tab, page + 1)} className={buttonStyles({ variant: "secondary" })}>
                  Next
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-ink px-4 py-3 ${highlight ? "border-warning/40" : "border-line"}`}>
      <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}
