import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { valuesFromEvent } from "@/lib/events/form-values";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import { updateEvent } from "../../../actions";
import { EventForm } from "../../event-form";
import { ArchiveForm } from "./archive-form";

export const metadata: Metadata = { title: "Settings" };

type Props = PageProps<"/dashboard/events/[eventId]/settings">;

export default function SettingsPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
      <Settings params={props.params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const [event, workspace] = await Promise.all([getEvent(eventId), getWorkspace()]);
  if (!event) notFound();

  if (workspace?.role !== "owner") {
    return <Card className="p-8 text-muted">Only an owner of the organization can change event settings.</Card>;
  }

  const archived = event.status === "archived";

  return (
    <div className="space-y-12">
      <EventForm key={event.id} mode="edit" action={updateEvent.bind(null, event.id)} initial={valuesFromEvent(event)} />

      <section className="max-w-2xl space-y-4 border-t border-line pt-8">
        <h2 className="font-display text-lg font-semibold">{archived ? "This event is archived" : "Archive this event"}</h2>
        <p className="text-muted">
          {archived
            ? "Archived events are closed to guests and do not count toward your one active Free event. Restore it to open it again."
            : "Archiving closes the event to guests and frees your Free event slot. Nothing is deleted, and you can restore it later."}
        </p>
        <ArchiveForm eventId={event.id} archived={archived} />
      </section>
    </div>
  );
}
