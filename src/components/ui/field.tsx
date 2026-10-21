import type { ComponentProps } from "react";

/** A labelled text input. Pass `error` to mark it invalid. */
export function TextField({
  id,
  label,
  error,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "id"> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`mt-2 block h-12 w-full rounded-xl border bg-ink px-4 text-base placeholder:text-muted/60 focus:border-neon-violet ${
          error ? "border-danger" : "border-line"
        } ${className}`}
        {...props}
      />
    </div>
  );
}
