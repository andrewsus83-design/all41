/** The privacy notice body. Used by the public /privacy page and by /settings/privacy — one source, two places. */
export const PRIVACY_TITLE = "Privacy notice";
export const PRIVACY_LEAD = "This is a placeholder. The full notice is being written and will replace this page before public launch.";

export function PrivacyContent() {
  return (
    <div className="space-y-3 text-fg-muted leading-relaxed">
      <p>What we can already say plainly: your files, tasks and notes belong to your account and are used to answer your own questions only. We do not sell data. Keys for the AI services are ours and are never shown to you or stored in your account.</p>
      <p>Questions in the meantime: reply to any email from us.</p>
    </div>
  );
}
