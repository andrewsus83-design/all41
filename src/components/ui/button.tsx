import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "neon" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all scale-on-click " +
  "disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Gold is the platform's action color; neon cyan is for live, game and photo moments.
  primary: "bg-gold text-black shadow-gold hover:bg-gold-hover",
  secondary: "border border-line-strong text-fg hover:border-gold",
  ghost: "text-muted hover:text-fg",
  neon: "bg-neon-cyan text-black shadow-neon hover:bg-neon-cyan-hover",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger hover:text-white",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-6 text-sm",
  lg: "h-14 rounded-[1.5rem] px-8 text-lg",
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
