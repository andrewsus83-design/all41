import type { ReactNode } from "react";

/** Class names shared by text inputs, selects and text areas. */
export function controlStyles(invalid = false) {
  return `block w-full rounded-xl border bg-ink px-4 text-base placeholder:text-muted/60 focus:border-neon-violet ${
    invalid ? "border-danger" : "border-line"
  }`;
}

/** What a control's aria-describedby should point at: its error when it has one, otherwise its hint. */
export function describedBy(id: string, { hint, error }: { hint?: string; error?: string }) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

/** A label, a control and the hint or error that belongs to it. */
export function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** A problem with a whole form, announced to screen readers. Renders nothing when there is none. */
export function FormError({ children }: { children?: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger empty:hidden">
      {children}
    </p>
  );
}
