"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import { setEventArchived } from "../../../actions";

export function ArchiveForm({ eventId, archived }: { eventId: string; archived: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setEventArchived.bind(null, eventId, !archived), {});

  return (
    <form action={action} className="space-y-4">
      <FormError>{state.error}</FormError>
      <Button type="submit" variant="secondary" disabled={pending}>
        {archived ? (pending ? "Restoring…" : "Restore event") : pending ? "Archiving…" : "Archive event"}
      </Button>
    </form>
  );
}
