import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { newEventValues } from "@/lib/events/form-values";
import { getWorkspace } from "@/lib/events/queries";
import { createEvent } from "../../actions";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-fg">
          ← All events
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">New event</h1>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-panel" aria-hidden="true" />}>
        <NewEvent />
      </Suspense>
    </div>
  );
}

async function NewEvent() {
  const workspace = await getWorkspace();
  if (!workspace) notFound();

  if (workspace.role !== "owner") {
    return (
      <Card className="p-8">
        <p className="text-muted">Only an owner of {workspace.org.name} can create events.</p>
      </Card>
    );
  }

  return <EventForm mode="create" action={createEvent} initial={newEventValues()} />;
}
