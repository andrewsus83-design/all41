"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import { GuestStatusBadge } from "@/components/events/status-badges";
import type { GuestRecord } from "@/lib/events/records";
import type { FormState } from "@/lib/forms";
import { PHONE_HINT } from "@/lib/guests/phone";
import { deleteGuest, updateGuest } from "../../../actions";

export function GuestRow({ eventId, guest, canEdit }: { eventId: string; guest: GuestRecord; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string>();

  const remove = () => {
    if (!window.confirm(`Remove ${guest.name} from the guest list?`)) return;
    setRemoveError(undefined);
    startRemoving(async () => {
      const result = await deleteGuest(eventId, guest.id);
      if (result.error) setRemoveError(result.error);
    });
  };

  if (editing) {
    return <EditGuest eventId={eventId} guest={guest} onDone={() => setEditing(false)} />;
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium">{guest.name}</p>
          {guest.email && <p className="text-sm break-all text-muted">{guest.email}</p>}
          {guest.phone && <p className="text-sm text-muted tabular-nums">{guest.phone}</p>}
          {!guest.email && !guest.phone && <p className="text-sm text-muted">No contact details</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {guest.tags.map((tag) => (
            <Badge key={tag} tone="cyan">
              {tag}
            </Badge>
          ))}
          {guest.tableNo && <Badge>Table {guest.tableNo}</Badge>}
          <GuestStatusBadge status={guest.status} />
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Edit ${guest.name}`}>
              Edit
            </Button>
            <Button variant="ghost" onClick={remove} disabled={removing} aria-label={`Remove ${guest.name}`}>
              {removing ? "Removing…" : "Remove"}
            </Button>
          </div>
        )}
      </div>
      {removeError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {removeError}
        </p>
      )}
    </li>
  );
}

function EditGuest({ eventId, guest, onDone }: { eventId: string; guest: GuestRecord; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateGuest.bind(null, eventId, guest.id), {});
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const control = (name: string) => `${controlStyles(Boolean(errorOf(name)))} h-11`;
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  // Close the editor once a save went through.
  useEffect(() => {
    if (state.saved) onDone();
  }, [state, onDone]);

  return (
    <li className="bg-panel-raised/50 px-5 py-5 sm:px-6">
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={fieldId("name")} label="Name" error={errorOf("name")}>
            <input
              id={fieldId("name")}
              name="name"
              required
              maxLength={160}
              defaultValue={value("name", guest.name)}
              aria-invalid={errorOf("name") ? true : undefined}
              aria-describedby={describedBy(fieldId("name"), { error: errorOf("name") })}
              className={control("name")}
            />
          </Field>
          <Field id={fieldId("email")} label="Email" optional error={errorOf("email")}>
            <input
              id={fieldId("email")}
              name="email"
              type="email"
              defaultValue={value("email", guest.email ?? "")}
              aria-invalid={errorOf("email") ? true : undefined}
              aria-describedby={describedBy(fieldId("email"), { error: errorOf("email") })}
              className={control("email")}
            />
          </Field>
          <Field id={fieldId("phone")} label="Phone / WhatsApp" optional error={errorOf("phone")} hint={PHONE_HINT}>
            <input
              id={fieldId("phone")}
              name="phone"
              type="tel"
              defaultValue={value("phone", guest.phone ?? "")}
              aria-invalid={errorOf("phone") ? true : undefined}
              aria-describedby={describedBy(fieldId("phone"), { hint: PHONE_HINT, error: errorOf("phone") })}
              className={control("phone")}
            />
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-4">
            <Field id={fieldId("tags")} label="Tags" optional error={errorOf("tags")} hint="Separate with commas.">
              <input
                id={fieldId("tags")}
                name="tags"
                defaultValue={value("tags", guest.tags.join(", "))}
                aria-invalid={errorOf("tags") ? true : undefined}
                aria-describedby={describedBy(fieldId("tags"), { hint: "hint", error: errorOf("tags") })}
                className={control("tags")}
              />
            </Field>
            <Field id={fieldId("tableNo")} label="Table" optional error={errorOf("tableNo")}>
              <input
                id={fieldId("tableNo")}
                name="tableNo"
                maxLength={20}
                defaultValue={value("tableNo", guest.tableNo ?? "")}
                aria-invalid={errorOf("tableNo") ? true : undefined}
                aria-describedby={describedBy(fieldId("tableNo"), { error: errorOf("tableNo") })}
                className={control("tableNo")}
              />
            </Field>
          </div>
        </div>
        <FormError>{state.error}</FormError>
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}
