import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** v7 — inputs sit on the sunken well, warm border, coral focus. ≥16px to avoid iOS zoom. */
const base =
  "w-full bg-sunken border border-line-strong rounded-2 px-4 text-fg placeholder:text-fg-faint outline-none transition focus:border-coral-solid focus:ring-2 focus:ring-coral-solid/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "py-3 min-h-28 resize-y", className)} {...props} />;
}
