import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "w-full bg-bg-elev border border-line rounded-2 px-4 text-fg placeholder:text-fg-faint outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "py-3 min-h-28 resize-y", className)} {...props} />;
}
