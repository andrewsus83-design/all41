import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { capacityOf } from "@/lib/events/capacity";
import { countGuests, getEvent, getWorkspace, listGuestContacts } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import guests" };

type Props = PageProps<"/dashboard/events/[eventId]/guests/import">;

export default function ImportPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
      <Import params={props.params} />
    </Suspense>
  );
}

async function Import({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const guestsPath = `/dashboard/events/${eventId}/guests`;
  const workspace = await getWorkspace();
  const heading = (
    <div>
      <Link href={guestsPath} className="text-sm text-muted hover:text-fg">
        ← Guests
      </Link>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Import guests</h2>
    </div>
  );

  if (workspace?.role !== "owner") {
    return (
      <div className="space-y-6">
        {heading}
        <Card className="p-8 text-muted">Only an owner of the organization can import guests.</Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [contacts, used] = await Promise.all([listGuestContacts(eventId), countGuests(supabase, eventId)]);
  const capacity = capacityOf(event, used);

  return (
    <div className="space-y-6">
      {heading}
      <ImportWizard
        eventId={eventId}
        guestsPath={guestsPath}
        existingEmails={[...contacts.emails]}
        existingPhones={[...contacts.phones]}
        remaining={capacity.remaining}
      />
    </div>
  );
}
