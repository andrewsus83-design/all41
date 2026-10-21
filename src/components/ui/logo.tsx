import Link from "next/link";
import { useId } from "react";

/** The all41 mark: a neon "4" beside a gold "1". Drawn in paths so it needs no font. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3ecb" />
          <stop offset="1" stopColor="#27e6ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0f0f19" />
      <g fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 13v38M26 13 9 38h27" stroke={`url(#${gradientId})`} />
        <path d="M44 23l8-10v38" stroke="#d4af5f" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
      <LogoMark />
      <span>
        all<span className="text-gold-shine">41</span>
      </span>
    </Link>
  );
}
