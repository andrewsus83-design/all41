import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { EventStatusBadge, PackageBadge } from "@/components/events/status-badges";
import { getEvent } from "@/lib/events/queries";
import { formatEventRange } from "@/lib/events/time";
import { EventTabs } from "./event-tabs";

export default function EventLayout(props: LayoutProps<"/dashboard/events/[eventId]">) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventShell params={props.params}>{props.children}</EventShell>
    </Suspense>
  );
}

function EventSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="h-10 w-72 animate-pulse rounded-2xl bg-panel-raised" />
      <div className="h-11 w-full animate-pulse rounded-2xl bg-panel" />
      <div className="h-64 animate-pulse rounded-2xl bg-panel" />
    </div>
  );
}

async function EventShell({
  params,
  children,
}: {
  params: LayoutProps<"/dashboard/events/[eventId]">["params"];
  children: ReactNode;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
          ← All events
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight break-words sm:text-4xl">{event.name}</h1>
          <div className="flex gap-2">
            <EventStatusBadge status={event.status} />
            <PackageBadge tier={event.package} />
          </div>
        </div>
        <p className="text-muted">{formatEventRange(event.startsAt, event.endsAt, event.timezone)}</p>
      </div>
      <EventTabs base={`/dashboard/events/${event.id}`} />
      {children}
    </div>
  );
}
