import { Check, Ticket } from "lucide-react";
import { QrCode } from "@/components/qr/qr-code";
import { clock, partyLabel } from "@/lib/guest/format";
import { invitationUrl } from "@/lib/guest/links";

/**
 * The guest's entry pass, in the brand kit's ticket pattern. The QR code carries the whole invitation
 * address, `<site>/i/<token>`: the check-in screen reads the token from the last part of it.
 */
export function Pass({
  token,
  guestName,
  tableNo,
  partySize,
  eventName,
  timeZone,
  checkedInAt,
}: {
  token: string;
  guestName: string;
  tableNo: string | null;
  partySize: number;
  eventName: string;
  timeZone: string;
  checkedInAt: string | null;
}) {
  const details = [tableNo ? `Table ${tableNo}` : null, partyLabel(partySize)].filter(Boolean).join("  ·  ");

  return (
    <section aria-label="Your entry pass" className="ticket-cutout flex flex-col rounded-[2.5rem] border border-line bg-panel shadow-gold">
      <div className="flex flex-1 flex-col items-center justify-center border-b-2 border-dashed border-line-strong px-8 py-9 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold/10 text-gold" aria-hidden="true">
          <Ticket className="size-7" />
        </span>
        <p className="mt-4 text-xs font-bold tracking-widest text-subtle uppercase">Entry pass</p>
        <h2 className="mt-1 font-display text-3xl leading-tight font-medium break-words">{guestName}</h2>
        <p className="mt-1 text-muted">{details}</p>
        <p className="mt-3 text-sm text-subtle">{eventName}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-b-[2.5rem] bg-surface px-8 py-8">
        <div className="size-52 overflow-hidden rounded-2xl [&>svg]:size-full">
          <QrCode value={invitationUrl(token)} size={208} label={`QR code of the entry pass for ${guestName}`} />
        </div>
        {checkedInAt ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-bold text-success">
            <Check className="size-4" aria-hidden="true" />
            Checked in at {clock(new Date(checkedInAt), timeZone)}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">Show this code at the entrance</p>
        )}
      </div>
    </section>
  );
}
