"use client";

import { startTransition, useActionState, useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, controlStyles, describedBy } from "@/components/ui/form";
import { ThemePreview } from "@/components/events/theme-preview";
import { presetAccent, suggestSlug, type EventFormValues } from "@/lib/events/form-values";
import { EVENT_TYPES } from "@/lib/events/schema";
import { THEME_FONTS, THEME_FONT_IDS, THEME_PRESETS, THEME_PRESET_IDS, accentProblem } from "@/lib/events/theme";
import { TIMEZONES, addMinutesToLocal, formatEventRange, zonedTimeToUtc } from "@/lib/events/time";
import type { FormState } from "@/lib/forms";

const TYPE_LABELS = {
  corporate: { name: "Corporate", blurb: "Gathering, launch, town hall, gala" },
  wedding: { name: "Wedding", blurb: "Invitation and reception" },
} as const;

/** How long an event lasts when only its start has been chosen. */
const DEFAULT_DURATION_MINUTES = 180;

function Choice({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neon-cyan ${
        checked ? "border-neon-violet bg-panel-raised" : "border-line hover:border-neon-violet/60"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      {children}
    </label>
  );
}

export function EventForm({
  action,
  initial,
  mode,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  initial: EventFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const errorOf = (name: string) => state.fieldErrors?.[name]?.[0];

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function changeName(name: string) {
    setValues((current) => ({ ...current, name, slug: slugTouched ? current.slug : suggestSlug(name) }));
  }

  function changeStart(startsAt: string) {
    setValues((current) => {
      // Keep the end after the start, so a host only has to pick the start in most cases.
      const needsEnd = !current.endsAt || current.endsAt <= startsAt;
      return { ...current, startsAt, endsAt: needsEnd ? (addMinutesToLocal(startsAt, DEFAULT_DURATION_MINUTES) ?? current.endsAt) : current.endsAt };
    });
  }

  const theme = {
    preset: values.themePreset,
    font: values.themeFont,
    ...(values.themeAccent ? { accent: values.themeAccent } : {}),
  };
  const accentWarning = accentProblem(theme);

  const start = zonedTimeToUtc(values.startsAt, values.timezone);
  const end = zonedTimeToUtc(values.endsAt, values.timezone);
  const when = start && end ? formatEventRange(start, end, values.timezone) : "Date and time";
  const where = values.venueName.trim() || "Venue";

  const control = (name: string, extra = "h-12") => `${controlStyles(Boolean(errorOf(name)))} ${extra}`;

  // React clears a form once its action finishes, which puts radio buttons and
  // lists back to their first choice. This form is controlled by state, so the
  // action is called from here and nothing is reset. Without JavaScript the
  // form still posts to the action.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-10">
        <fieldset className="space-y-5">
          <legend className="font-display text-lg font-semibold">The basics</legend>

          <Field id={fieldId("name")} label="Event name" error={errorOf("name")}>
            <input
              id={fieldId("name")}
              name="name"
              required
              maxLength={160}
              value={values.name}
              onChange={(event) => changeName(event.target.value)}
              placeholder="Annual Dinner 2026"
              aria-describedby={describedBy(fieldId("name"), { error: errorOf("name") })}
              aria-invalid={errorOf("name") ? true : undefined}
              className={control("name")}
            />
          </Field>

          <div>
            <p className="text-sm font-medium">Type</p>
            {mode === "edit" ? (
              <>
                <input type="hidden" name="type" value={values.type} />
                <p className="mt-2 text-sm text-muted">
                  {TYPE_LABELS[values.type].name}. The type is chosen when the event is created.
                </p>
              </>
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {EVENT_TYPES.map((type) => (
                  <Choice key={type} name="type" value={type} checked={values.type === type} onChange={() => set("type", type)}>
                    <span>
                      <span className="block text-sm font-medium">{TYPE_LABELS[type].name}</span>
                      <span className="block text-sm text-muted">{TYPE_LABELS[type].blurb}</span>
                    </span>
                  </Choice>
                ))}
              </div>
            )}
            {errorOf("type") && <p className="mt-1.5 text-sm text-danger">{errorOf("type")}</p>}
          </div>

          <Field
            id={fieldId("slug")}
            label="Event address"
            hint={mode === "edit" ? "Changing the address breaks links you have already shared." : "Letters, numbers and hyphens. Guests open your event here."}
            error={errorOf("slug")}
          >
            <div className="flex">
              <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-line bg-panel px-3 text-sm text-muted">
                all41.app/e/
              </span>
              <input
                id={fieldId("slug")}
                name="slug"
                required
                minLength={3}
                maxLength={40}
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value.toLowerCase());
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="annual-dinner-2026"
                aria-describedby={describedBy(fieldId("slug"), {
                  hint: "hint",
                  error: errorOf("slug"),
                })}
                aria-invalid={errorOf("slug") ? true : undefined}
                className={`${controlStyles(Boolean(errorOf("slug")))} h-12 rounded-l-none`}
              />
            </div>
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display text-lg font-semibold">When and where</legend>

          <Field id={fieldId("timezone")} label="Time zone" error={errorOf("timezone")}>
            <select
              id={fieldId("timezone")}
              name="timezone"
              value={values.timezone}
              onChange={(event) => set("timezone", event.target.value)}
              className={control("timezone")}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={fieldId("startsAt")} label="Starts" error={errorOf("startsAt")}>
              <input
                id={fieldId("startsAt")}
                name="startsAt"
                type="datetime-local"
                required
                value={values.startsAt}
                onChange={(event) => changeStart(event.target.value)}
                aria-invalid={errorOf("startsAt") ? true : undefined}
                aria-describedby={describedBy(fieldId("startsAt"), { error: errorOf("startsAt") })}
                className={control("startsAt")}
              />
            </Field>
            <Field id={fieldId("endsAt")} label="Ends" error={errorOf("endsAt")}>
              <input
                id={fieldId("endsAt")}
                name="endsAt"
                type="datetime-local"
                required
                value={values.endsAt}
                min={values.startsAt || undefined}
                onChange={(event) => set("endsAt", event.target.value)}
                aria-invalid={errorOf("endsAt") ? true : undefined}
                aria-describedby={describedBy(fieldId("endsAt"), { error: errorOf("endsAt") })}
                className={control("endsAt")}
              />
            </Field>
          </div>

          <Field id={fieldId("venueName")} label="Venue" optional error={errorOf("venueName")}>
            <input
              id={fieldId("venueName")}
              name="venueName"
              maxLength={160}
              value={values.venueName}
              onChange={(event) => set("venueName", event.target.value)}
              placeholder="Grand Ballroom, Hotel Indonesia Kempinski"
              className={control("venueName")}
            />
          </Field>

          <Field id={fieldId("venueAddress")} label="Address" optional error={errorOf("venueAddress")}>
            <textarea
              id={fieldId("venueAddress")}
              name="venueAddress"
              maxLength={400}
              rows={3}
              value={values.venueAddress}
              onChange={(event) => set("venueAddress", event.target.value)}
              className={control("venueAddress", "py-3")}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="font-display text-lg font-semibold">Look and feel</legend>
          <p className="-mt-2 text-sm text-muted">
            The Event Theme dresses every guest page of this event: the invitation, the RSVP, the photo wall and the games.
          </p>

          <div>
            <p className="text-sm font-medium">Theme</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {THEME_PRESET_IDS.map((preset) => (
                <Choice
                  key={preset}
                  name="themePreset"
                  value={preset}
                  checked={values.themePreset === preset}
                  onChange={() => set("themePreset", preset)}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 size-8 shrink-0 rounded-lg border border-line"
                    style={{
                      background: `linear-gradient(135deg, ${THEME_PRESETS[preset].background} 55%, ${THEME_PRESETS[preset].accent} 55%)`,
                    }}
                  />
                  <span>
                    <span className="block text-sm font-medium">{THEME_PRESETS[preset].name}</span>
                    <span className="block text-sm text-muted">{THEME_PRESETS[preset].blurb}</span>
                  </span>
                </Choice>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Accent color</p>
            <input type="hidden" name="themeAccent" value={values.themeAccent} />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Accent color"
                value={values.themeAccent || presetAccent(values.themePreset)}
                onChange={(event) => set("themeAccent", event.target.value)}
                className="h-12 w-16 cursor-pointer rounded-xl border border-line bg-ink p-1"
              />
              <span className="text-sm text-muted">
                {values.themeAccent ? values.themeAccent.toUpperCase() : "The theme's own accent"}
              </span>
              {values.themeAccent && (
                <Button variant="ghost" onClick={() => set("themeAccent", "")}>
                  Use the theme&apos;s accent
                </Button>
              )}
            </div>
            {(accentWarning || errorOf("themeAccent")) && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {errorOf("themeAccent") ?? accentWarning}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium">Headings</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {THEME_FONT_IDS.map((font) => (
                <Choice key={font} name="themeFont" value={font} checked={values.themeFont === font} onChange={() => set("themeFont", font)}>
                  <span>
                    <span className="block text-sm font-medium">{THEME_FONTS[font].name}</span>
                    <span className="block text-sm text-muted">{THEME_FONTS[font].blurb}</span>
                  </span>
                </Choice>
              ))}
            </div>
          </div>
        </fieldset>

        <div className="space-y-4">
          <FormError>{state.error}</FormError>
          {state.saved && (
            <p role="status" className="rounded-xl border border-neon-lime/40 bg-neon-lime/10 px-4 py-3 text-sm text-neon-lime">
              Changes saved.
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {mode === "create" ? (pending ? "Creating…" : "Create event") : pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-sm font-medium">Preview</p>
        <ThemePreview theme={theme} name={values.name} when={when} where={where} />
      </aside>
    </form>
  );
}
