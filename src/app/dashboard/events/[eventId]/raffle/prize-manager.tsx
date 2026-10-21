"use client";

import { ChevronDown, ChevronUp, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import type { FormState } from "@/lib/forms";
import type { RafflePrize } from "@/lib/raffle/records";
import { createPrize, deletePrize, movePrize, updatePrize } from "./actions";

/** The prizes in the order they are drawn. Owners add, edit, reorder and delete; staff see the list. */
export function PrizeManager({ eventId, prizes, canManage, atLimit }: { eventId: string; prizes: RafflePrize[]; canManage: boolean; atLimit: boolean }) {
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Gift className="size-5 text-gold" aria-hidden="true" />
        <h2 className="font-display text-xl font-semibold">Prizes</h2>
      </div>
      <p className="text-sm text-muted">
        Prizes are drawn in this order. A prize can have several winners. Only guests who have checked in can win, and each guest can win once.
      </p>

      {prizes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-muted">
          {canManage ? "No prizes yet. Add the first one below." : "No prizes have been added yet."}
        </p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {prizes.map((prize, index) => (
            <PrizeRow key={prize.id} eventId={eventId} prize={prize} index={index} count={prizes.length} canManage={canManage} />
          ))}
        </ol>
      )}

      {canManage &&
        (atLimit ? <p className="text-sm text-muted">An event can have up to 100 prizes.</p> : <AddPrize eventId={eventId} />)}
    </Card>
  );
}

function PrizeRow({ eventId, prize, index, count, canManage }: { eventId: string; prize: RafflePrize; index: number; count: number; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string>();

  const run = (work: () => Promise<{ error?: string }>) => {
    setProblem(undefined);
    startTransition(async () => {
      const result = await work();
      if (result.error) setProblem(result.error);
    });
  };

  if (editing) return <EditPrize eventId={eventId} prize={prize} onDone={() => setEditing(false)} />;

  const done = prize.awarded >= prize.quantity;
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold font-display text-lg font-bold text-black">{index + 1}</span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="font-display text-lg font-semibold break-words">{prize.name}</p>
          <p className="text-sm text-muted">
            {prize.quantity === 1 ? "1 winner" : `${prize.quantity} winners`}
          </p>
        </div>
        <Badge tone={done ? "success" : prize.awarded > 0 ? "cyan" : "neutral"}>
          {done ? "All drawn" : `${prize.awarded} of ${prize.quantity} drawn`}
        </Badge>
        {canManage && (
          <div className="flex items-center gap-1.5">
            <IconButton label={`Move ${prize.name} up`} disabled={pending || index === 0} onClick={() => run(() => movePrize(eventId, prize.id, "up"))}>
              <ChevronUp className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Move ${prize.name} down`}
              disabled={pending || index === count - 1}
              onClick={() => run(() => movePrize(eventId, prize.id, "down"))}
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label={`Edit ${prize.name}`} disabled={pending} onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Delete ${prize.name}`}
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete the prize "${prize.name}"?`)) run(() => deletePrize(eventId, prize.id));
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}
      </div>
      {problem && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {problem}
        </p>
      )}
    </li>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-2xl border border-line-strong text-muted transition-colors hover:border-gold hover:text-fg disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

function PrizeFields({ state, defaults, idPrefix }: { state: FormState; defaults: { name: string; quantity: string }; idPrefix: string }) {
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];
  const control = (name: string) => `${controlStyles(Boolean(errorOf(name)))} h-12`;
  return (
    <div className="grid grid-cols-[1fr_7rem] gap-4">
      <Field id={`${idPrefix}-name`} label="Prize" error={errorOf("name")}>
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="Smart TV"
          defaultValue={state.values?.name ?? defaults.name}
          aria-invalid={errorOf("name") ? true : undefined}
          aria-describedby={describedBy(`${idPrefix}-name`, { error: errorOf("name") })}
          className={control("name")}
        />
      </Field>
      <Field id={`${idPrefix}-quantity`} label="Winners" error={errorOf("quantity")}>
        <input
          id={`${idPrefix}-quantity`}
          name="quantity"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={500}
          defaultValue={state.values?.quantity ?? defaults.quantity}
          aria-invalid={errorOf("quantity") ? true : undefined}
          aria-describedby={describedBy(`${idPrefix}-quantity`, { error: errorOf("quantity") })}
          className={control("quantity")}
        />
      </Field>
    </div>
  );
}

function AddPrize({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPrize.bind(null, eventId), {});
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display text-lg font-semibold">Add a prize</h3>
      <PrizeFields state={state} defaults={{ name: "", quantity: "1" }} idPrefix={id} />
      <FormError>{state.error}</FormError>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" aria-hidden="true" /> {pending ? "Adding…" : "Add prize"}
      </Button>
    </form>
  );
}

function EditPrize({ eventId, prize, onDone }: { eventId: string; prize: RafflePrize; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePrize.bind(null, eventId, prize.id), {});
  const id = useId();

  useEffect(() => {
    if (state.saved) onDone();
  }, [state, onDone]);

  return (
    <li className="bg-panel-raised/50 px-4 py-5 sm:px-5">
      <form action={action} className="space-y-4">
        <PrizeFields state={state} defaults={{ name: prize.name, quantity: String(prize.quantity) }} idPrefix={id} />
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
