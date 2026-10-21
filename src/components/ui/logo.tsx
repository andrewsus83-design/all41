import Link from "next/link";

/** The all41 mark: a gold disc with "41" in it, as in the brand kit. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${className} shrink-0 items-center justify-center rounded-full bg-gold font-display text-[0.95em] leading-none font-bold text-black shadow-gold`}
    >
      41
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 font-display text-xl font-semibold tracking-tight">
      <LogoMark />
      <span>
        all<span className="text-gold">41</span>
      </span>
    </Link>
  );
}
