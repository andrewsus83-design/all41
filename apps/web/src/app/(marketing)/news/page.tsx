import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHead, N } from "@/components/marketing/primitives";
import { UPDATES } from "@/content/updates";

export const metadata: Metadata = {
  title: "News — what we shipped, in the open.",
  description: "all41 build-in-public news: what we shipped and why, in plain words. Pay-per-use AI that does the work — no subscription.",
};

function fmt(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${d}, ${y}`;
}

export default function NewsPage() {
  return (
    <Section className="pt-28 md:pt-36">
      <SectionHead eyebrow="News" title="What we shipped, in the open." lead="We build in public. Every change, in plain words — no roadmap theatre, no jargon." />
      <div className="max-w-2xl mx-auto space-y-5">
        {UPDATES.map((u, i) => (
          <article key={i} className="glass grad-ring rounded-5 p-7 text-left lift">
            <p className="num text-xs uppercase tracking-[0.15em] text-fg-faint mb-2">{fmt(u.date)}</p>
            <h2 className="font-title text-xl font-bold mb-2 text-fg">{u.title}</h2>
            <p className="text-fg-muted leading-relaxed">{u.body}</p>
          </article>
        ))}
      </div>
      <p className="text-center text-fg-muted mt-12">
        Want in? <Link href="/login" className="text-coral underline underline-offset-4">Start free — <N>$2</N></Link>.
      </p>
    </Section>
  );
}
