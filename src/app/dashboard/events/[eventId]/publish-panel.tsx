"use client";

import { ExternalLink, Globe, Lock } from "lucide-react";
import { useActionState } from "react";
import { CopyLinkButton } from "@/components/guest/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { setEventStatus } from "../../actions";

/**
 * Whether guests can see the event, and the link to share. Guests can open the event page and their
 * invitations only while the event is published. Owners publish and take it offline here; staff see the
 * state and the link.
 */
export function PublishPanel({
  eventId,
  status,
  link,
  canPublish,
}: {
  eventId: string;
  status: "draft" | "published" | "archived";
  link: string;
  canPublish: boolean;
}) {
  const published = status === "published";
  const [state, action, pending] = useActionState<FormState, FormData>(
    setEventStatus.bind(null, eventId, published ? "draft" : "published"),
    {},
  );

  const confirmOffline = (event: React.FormEvent<HTMLFormElement>) => {
    if (published && !window.confirm("Take this event offline? Guests will not be able to open the event page or their invitations until you publish it again.")) {
      event.preventDefault();
    }
  };

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
          {published ? <Globe className="size-5 text-success" aria-hidden="true" /> : <Lock className="size-5 text-subtle" aria-hidden="true" />}
          Guest page
        </h2>
        <Badge tone={published ? "success" : "neutral"}>{published ? "Live" : status === "archived" ? "Archived" : "Not published"}</Badge>
      </div>

      {published ? (
        <p className="text-muted">Guests can open this page and their personal invitations. Take it offline to close those links again; nothing is deleted.</p>
      ) : status === "archived" ? (
        <p className="text-muted">Archived events are closed to guests. Restore the event in Settings, then publish it.</p>
      ) : (
        <p className="text-muted">
          Guests cannot open their invitation links or the event page yet. Add your guests and check the details, then publish.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-5">
        <span className="min-w-0 flex-1 text-sm break-all text-fg" data-testid="event-link">
          {link}
        </span>
        <CopyLinkButton value={link} label="Copy the event link">
          Copy link
        </CopyLinkButton>
        {published && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 px-3 text-sm font-bold text-gold">
            <ExternalLink className="size-4" aria-hidden="true" />
            Open
          </a>
        )}
      </div>

      {canPublish && status !== "archived" && (
        <form action={action} onSubmit={confirmOffline} className="space-y-3">
          <FormError>{state.error}</FormError>
          <Button type="submit" variant={published ? "secondary" : "primary"} disabled={pending}>
            {published ? (pending ? "Taking offline…" : "Take offline") : pending ? "Publishing…" : "Publish event"}
          </Button>
        </form>
      )}
      {!canPublish && <p className="text-sm text-subtle">Only an owner can publish an event or take it offline.</p>}
    </Card>
  );
}
