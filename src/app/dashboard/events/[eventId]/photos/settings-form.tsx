"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import type { ModerationMode } from "@/lib/photos/records";
import { savePhotoSettings } from "./actions";

const MODES: { value: ModerationMode; title: string; blurb: string }[] = [
  { value: "manual", title: "Approve each photo first", blurb: "New photos wait here until you approve them. Nothing shows on the wall before that." },
  { value: "auto", title: "Show photos right away", blurb: "Photos go on the wall as soon as they arrive. You can still take any of them down." },
];

export function PhotoSettingsForm({
  eventId,
  enabled,
  moderation,
  canEdit,
}: {
  eventId: string;
  enabled: boolean;
  moderation: ModerationMode;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePhotoSettings.bind(null, eventId), {});

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Photo wall</dt>
            <dd>{enabled ? <Badge tone="cyan">On</Badge> : <Badge>Off</Badge>}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Before photos show</dt>
            <dd className="text-right font-medium">{MODES.find((mode) => mode.value === moderation)?.title}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">Only an owner of the organization can change these settings.</p>
      </div>
    );
  }

  const chosen = state.values?.moderation ?? moderation;
  const on = state.values ? state.values.enabled === "on" : enabled;

  return (
    <form action={action} className="space-y-5">
      <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-line bg-surface p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-neon-cyan">
        <input type="checkbox" name="enabled" defaultChecked={on} className="mt-0.5 size-6 shrink-0 accent-neon-cyan" />
        <span>
          <span className="block font-bold">The photo wall is on</span>
          <span className="block text-sm text-muted">Guests take photos from their invitation link and see the shared album. Switch it off to stop new photos.</span>
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-zinc-400">Before photos show on the wall</legend>
        {MODES.map((mode) => (
          <label
            key={mode.value}
            className="flex cursor-pointer items-start gap-4 rounded-2xl border border-line bg-surface p-4 has-[:checked]:border-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-neon-cyan"
          >
            <input type="radio" name="moderation" value={mode.value} defaultChecked={chosen === mode.value} className="mt-0.5 size-5 shrink-0 accent-gold" />
            <span>
              <span className="block font-bold">{mode.title}</span>
              <span className="block text-sm text-muted">{mode.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <FormError>{state.error}</FormError>
      {state.saved && (
        <p role="status" className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Settings saved.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
