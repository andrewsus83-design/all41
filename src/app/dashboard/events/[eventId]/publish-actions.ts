"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { classifyDbError } from "@/lib/db-errors";
import { getEvent, getWorkspace } from "@/lib/events/queries";
import type { FormState } from "@/lib/forms";
import { publicEventTag } from "@/lib/guest/cached";
import { createClient } from "@/lib/supabase/server";

// Every action here checks who is asking itself: the proxy only redirects for comfort,
// and row level security checks the same token once more in the database.

const OWNER_ONLY = "Only an owner of the organization can publish or unpublish an event.";
const GONE = "That event no longer exists, or you cannot edit it.";
const ARCHIVED = "An archived event cannot be published. Restore it in Settings first.";

/**
 * Publishes a draft event (guests can then open its page and their invitations) or takes a published
 * one back to draft. Bound to an event and a direction: `setEventPublished.bind(null, id, true)`.
 */
export async function setEventPublished(eventId: string, publish: boolean): Promise<FormState> {
  if (!z.uuid().safeParse(eventId).success) return { error: GONE };
  const workspace = await getWorkspace();
  if (!workspace) redirect("/dashboard");
  if (workspace.role !== "owner") return { error: OWNER_ONLY };

  const from = publish ? "draft" : "published";
  const to = publish ? "published" : "draft";

  const supabase = await createClient();
  // Only a draft is published and only a published event is unpublished: a second click, or a second
  // tab, finds nothing to change and is told how things stand instead of flipping the event back.
  const { data, error } = await supabase.from("a41_events").update({ status: to }).eq("id", eventId).eq("status", from).select("slug");
  if (error) {
    if (classifyDbError(error) === "archived_event_cannot_publish") return { error: ARCHIVED };
    if (classifyDbError(error) === "forbidden") return { error: OWNER_ONLY };
    console.error("[a41] could not change the publish state", error.code, error.message);
    return { error: "Something went wrong on our side. Please try again." };
  }

  if (data.length === 0) {
    const event = await getEvent(eventId);
    if (!event) return { error: GONE };
    if (event.status === to) return { saved: true };
    if (publish && event.status === "archived") return { error: ARCHIVED };
    return { error: GONE };
  }

  // The public page is cached for a minute; this makes the change show at once.
  updateTag(publicEventTag(data[0].slug));
  refresh();
  return { saved: true };
}
