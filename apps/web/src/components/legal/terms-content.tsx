/** The terms body. Used by the public /terms page and by /settings/terms — one source, two places. */
export const TERMS_TITLE = "Terms of service";
export const TERMS_LEAD = "This is a placeholder. The full terms are being written and will replace this page before public launch.";

export function TermsContent() {
  return (
    <div className="space-y-3 text-fg-muted leading-relaxed">
      <p>What we can already say plainly: you pay per task, the price is shown before a run, failed runs are not charged, and unused top-up credit can be refunded on request. Credits expire after twelve months.</p>
    </div>
  );
}
