import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors " +
  "disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-gold text-ink hover:bg-[#e3c276]",
  secondary: "border border-line bg-panel text-fg hover:border-neon-violet hover:bg-panel-raised",
  ghost: "text-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

/** Class names for anything that should look like a button, such as a link. */
export function buttonStyles({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export function Button({
  variant,
  size,
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={`${buttonStyles({ variant, size })} ${className}`} {...props} />;
}
