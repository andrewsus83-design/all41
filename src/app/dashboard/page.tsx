import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CapacityMeter } from "@/components/events/capacity-meter";
import { EventStatusBadge, PackageBadge } from "@/components/events/status-badges";
import { capacityOf } from "@/lib/events/capacity";
import { getWorkspace, listEvents, type EventSummary } from "@/lib/events/queries";
import { formatEventDay } from "@/lib/events/time";
import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Events" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<EventsSkeleton />}>
      <Events />
    </Suspense>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="h-10 w-48 animate-pulse rounded-2xl bg-panel-raised" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-48 animate-pulse rounded-2xl bg-panel" />
        ))}
      </div>
    </div>
  );
}

async function Events() {
  const workspace = await getWorkspace();
  if (!workspace) return <SetupWorkspace />;

  const events = await listEvents(workspace.org.id);
  const canCreate = workspace.role === "owner";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your events</h1>
          <p className="mt-2 text-muted">{workspace.org.name}</p>
        </div>
        {canCreate && events.length > 0 && (
          <Link href="/dashboard/events/new" className={buttonStyles()}>
            New event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <Card className="flex flex-col items-start gap-5 p-8 sm:p-10">
          <div className="space-y-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">No events yet</h2>
            <p className="max-w-xl text-muted">
              {canCreate
                ? "Create your first event, add the guest list and share the invitation. A Free event holds 5 guests, enough to try everything."
                : "Events your team creates will show up here."}
            </p>
          </div>
          {canCreate && (
            <Link href="/dashboard/events/new" className={buttonStyles({ size: "lg" })}>
              Create your first event
            </Link>
          )}
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link href={`/dashboard/events/${event.id}`} className="group block h-full">
      <Card className="flex h-full flex-col p-6 transition-colors group-hover:border-gold">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg leading-snug font-semibold break-words">{event.name}</h2>
          <EventStatusBadge status={event.status} />
        </div>
        <p className="mt-2 text-sm text-muted">{formatEventDay(event.startsAt, event.timezone)}</p>
        {event.venueName && <p className="text-sm text-muted">{event.venueName}</p>}
        <div className="mt-auto pt-6">
          <CapacityMeter capacity={capacityOf(event, event.guestCount)} compact />
          <div className="mt-4 flex flex-wrap gap-2">
            <PackageBadge tier={event.package} />
            <Badge>{event.type === "corporate" ? "Corporate" : "Wedding"}</Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SetupWorkspace() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to all41</h1>
        <p className="text-muted">One quick question, then you can create your first event.</p>
      </div>
      <Card className="p-7 sm:p-9">
        <WorkspaceForm />
      </Card>
    </div>
  );
}
