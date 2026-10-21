"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { setEventStatus } from "../../actions";

/** Guests can open their invitation and the event page only while the event is published. */
export function PublishPanel({ eventId, slug, published }: { eventId: string; slug: string; published: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    setEventStatus.bind(null, eventId, published ? "draft" : "published"),
    {},
  );

  return (
    <Card className="space-y-4 border-gold/30 p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{published ? "This event is live" : "This event is a draft"}</h2>
      <p className="text-muted">
        {published
          ? `Guests can open their invitations and the event page at all41.app/e/${slug}. Take it offline to close those links again; nothing is deleted.`
          : "Guests cannot open their invitation links or the event page yet. Add your guests and check the details, then publish."}
      </p>
      <form action={action} className="space-y-4">
        <FormError>{state.error}</FormError>
        <Button type="submit" variant={published ? "secondary" : "primary"} disabled={pending}>
          {published ? (pending ? "Taking offline…" : "Take offline") : pending ? "Publishing…" : "Publish event"}
        </Button>
      </form>
    </Card>
  );
}
