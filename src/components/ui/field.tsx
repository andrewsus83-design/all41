import type { ComponentProps } from "react";
import { controlStyles } from "./form";

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
      <label htmlFor={id} className="block text-sm font-bold text-zinc-400">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`mt-2 h-12 ${controlStyles(Boolean(error))} ${className}`}
        {...props}
      />
    </div>
  );
}
