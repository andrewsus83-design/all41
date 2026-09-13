import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Every number on the marketing site goes through this (Ground Rule 7). */
export function N({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("num", className)} {...props} />;
}

export function Section({ className, id, children }: { className?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("w-full max-w-6xl mx-auto px-6 py-20 md:py-28 scroll-mt-24", className)}>
      {children}
    </section>
  );
}

type Phase = "red" | "amber" | "green" | "neutral";
const dot: Record<Phase, string> = { red: "bg-red", amber: "bg-amber", green: "bg-green", neutral: "bg-fg-faint" };

export function Eyebrow({ phase = "neutral", children, className }: { phase?: Phase; children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-fg-muted font-semibold", className)}>
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full", dot[phase])} aria-hidden />
      {children}
    </p>
  );
}

export function H2({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-3xl md:text-5xl font-semibold leading-[1.08] max-w-3xl mx-auto text-center text-balance", className)} {...props} />;
}

export function Lead({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-lg md:text-xl text-fg-muted max-w-2xl mx-auto text-center leading-relaxed text-pretty", className)} {...props} />;
}

export function SectionHead({ phase, eyebrow, title, lead, children }: { phase?: Phase; eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 mb-12 md:mb-16">
      <Eyebrow phase={phase}>{eyebrow}</Eyebrow>
      <H2>{title}</H2>
      {lead ? <Lead>{lead}</Lead> : null}
      {children}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1 text-fg underline-offset-4 hover:underline", className)}>
      {children} <span aria-hidden>→</span>
    </Link>
  );
}
