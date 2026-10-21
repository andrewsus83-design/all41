import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlStyles } from "@/components/ui/form";
import { CapacityMeter } from "@/components/events/capacity-meter";
import { capacityOf } from "@/lib/events/capacity";
import { countGuests, getEvent, getWorkspace, listGuests } from "@/lib/events/queries";
import { GUEST_STATUSES, GUEST_STATUS_LABELS } from "@/lib/events/records";
import { GUESTS_PER_PAGE, guestsHref, parseGuestFilters } from "@/lib/guests/filters";
import { createClient } from "@/lib/supabase/server";
import { AddGuestForm } from "./add-guest-form";
import { AddGuestPanel } from "./add-guest-panel";
import { GuestRow } from "./guest-row";

export const metadata: Metadata = { title: "Guests" };

type Props = PageProps<"/dashboard/events/[eventId]/guests">;

export default function GuestsPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
      <Guests params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Guests({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { eventId } = await params;
  const filters = parseGuestFilters(await searchParams);
  const event = await getEvent(eventId);
  if (!event) notFound();

  const supabase = await createClient();
  const [workspace, used, list] = await Promise.all([
    getWorkspace(),
    countGuests(supabase, eventId),
    listGuests(eventId, { search: filters.search, status: filters.status, page: filters.page, pageSize: GUESTS_PER_PAGE }),
  ]);

  const base = `/dashboard/events/${eventId}/guests`;
  const canEdit = workspace?.role === "owner";
  const capacity = capacityOf(event, used);
  const pages = Math.max(1, Math.ceil(list.total / GUESTS_PER_PAGE));
  const first = list.total === 0 ? 0 : (filters.page - 1) * GUESTS_PER_PAGE + 1;
  const last = Math.min(list.total, filters.page * GUESTS_PER_PAGE);
  const filtered = Boolean(filters.search || filters.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <CapacityMeter capacity={capacity} />
        </div>
        <div className="flex flex-wrap gap-3">
          {used > 0 && (
            <a href={`${base}/export`} className={buttonStyles({ variant: "secondary" })}>
              Export CSV
            </a>
          )}
          {canEdit && (
            <Link href={`${base}/import`} className={buttonStyles({ variant: "secondary" })}>
              Import CSV
            </Link>
          )}
        </div>
      </div>

      {canEdit && (
        <AddGuestPanel defaultOpen={used === 0}>
          <AddGuestForm eventId={eventId} disabledReason={capacity.full ? "The guest list is full. Remove a guest or add capacity to add more." : undefined} />
        </AddGuestPanel>
      )}

      <form method="get" action={base} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="guest-search" className="sr-only">
            Search guests
          </label>
          <input
            id="guest-search"
            name="q"
            type="search"
            defaultValue={filters.search}
            placeholder="Search by name, email or phone"
            className={`${controlStyles()} h-11`}
          />
        </div>
        <div>
          <label htmlFor="guest-status" className="sr-only">
            Status
          </label>
          <select id="guest-status" name="status" defaultValue={filters.status ?? ""} className={`${controlStyles()} h-11 pr-8`}>
            <option value="">All statuses</option>
            {GUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {GUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonStyles({ variant: "secondary" })}>
          Search
        </button>
        {filtered && (
          <Link href={base} className="inline-flex h-10 items-center text-sm text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      {list.total === 0 ? (
        <Card className="p-8 text-center text-muted">
          {filtered ? (
            <p>No guests match that search.</p>
          ) : list.outOfRange ? (
            <p>
              That page does not exist.{" "}
              <Link href={base} className="text-gold underline">
                Back to the first page
              </Link>
            </p>
          ) : (
            <p>{canEdit ? "No guests yet. Add the first one above, or import a CSV file." : "No guests yet."}</p>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {list.guests.map((guest) => (
              <GuestRow key={guest.id} eventId={eventId} guest={guest} canEdit={canEdit} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
            <p>
              Showing {first.toLocaleString("en-US")}–{last.toLocaleString("en-US")} of {list.total.toLocaleString("en-US")}
            </p>
            {pages > 1 && (
              <nav aria-label="Pages" className="flex gap-2">
                {filters.page > 1 && (
                  <Link href={guestsHref(base, filters, filters.page - 1)} className={buttonStyles({ variant: "secondary" })}>
                    Previous
                  </Link>
                )}
                {filters.page < pages && (
                  <Link href={guestsHref(base, filters, filters.page + 1)} className={buttonStyles({ variant: "secondary" })}>
                    Next
                  </Link>
                )}
              </nav>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
