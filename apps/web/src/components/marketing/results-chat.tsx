import Image from "next/image";
import { coverFor } from "@/content/covers";

/** A chat-style demo of what published apps hand back — snippets of real live-app results. */
type Exchange = { slug: string; app: string; price: string; ask: string; snippet: string; chips: string[] };

const EXCHANGES: Exchange[] = [
  {
    slug: "seo-geo-optimizer",
    app: "SEO & GEO Optimizer",
    price: "4",
    ask: "Audit my site for Google and AI answers",
    snippet: "Two health scores, your top-5 quick wins, and technical + GEO findings — in plain language, every claim sourced.",
    chips: ["SEO 82", "GEO 61", "5 quick wins", "sources ✓"],
  },
  {
    slug: "proposal-rfp-maker",
    app: "Proposal / RFP Maker",
    price: "9",
    ask: "Turn this RFP into a proposal draft",
    snippet: "A compliance matrix, an executive summary, and consultant-grade sections with win themes and flags.",
    chips: ["compliance ✓", "6 sections", "3 win themes"],
  },
  {
    slug: "advanced-research",
    app: "Advanced Research",
    price: "1.50",
    ask: "Research the pet-tech market for me",
    snippet: "One sharp, sourced answer — the key points and a clear next move, with every number cited.",
    chips: ["4 sources", "key numbers", "next move"],
  },
];

export function ResultsChat() {
  return (
    <div className="rounded-5 border border-line bg-bg-elev shadow-lift p-5 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-fg-faint">
          <span className="w-2 h-2 rounded-full bg-green-solid pulse-soft" aria-hidden /> Live results
        </p>
        <span className="num text-xs text-fg-faint">priced before each run</span>
      </div>

      {EXCHANGES.map((e) => {
        const cover = coverFor(e.slug);
        return (
          <div key={e.slug} className="space-y-2">
            <div className="flex justify-end">
              <p className="max-w-[82%] rounded-3 rounded-tr-md bg-sunken px-3.5 py-2 text-sm text-fg">{e.ask}</p>
            </div>
            <div className="flex gap-2.5">
              <div className="shrink-0 w-9 h-9 rounded-2 overflow-hidden border border-line bg-bg relative">
                {cover ? <Image src={cover} alt="" fill sizes="36px" className="object-cover" /> : null}
              </div>
              <div className="max-w-[86%] rounded-3 rounded-tl-md border border-line bg-bg px-3.5 py-2.5 space-y-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-title font-semibold text-fg">{e.app}</p>
                  <span className="num text-[11px] text-fg-faint">≈ ${e.price}</span>
                </div>
                <p className="text-sm text-fg-muted leading-relaxed">{e.snippet}</p>
                <div className="flex flex-wrap gap-1.5">
                  {e.chips.map((c) => (
                    <span key={c} className="squircle rounded-1 border border-green/40 bg-green-soft px-2 py-0.5 text-[11px] font-mono text-green">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
