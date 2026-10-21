import { Check, Hourglass, Heart } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventFacts } from "@/components/guest/event-facts";
import { GuestShell } from "@/components/guest/guest-shell";
import { headingStyle } from "@/components/guest/theme-scope";
import { Card } from "@/components/ui/card";
import { firstName, partyLabel } from "@/lib/guest/format";
import { openInvitation } from "@/lib/guest/public";
import type { Invitation } from "@/lib/guest/records";
import { ActionCards, invitationCards } from "./action-cards";
import { ChangeAnswer } from "./change-answer";
import { Pass } from "./pass";
import { RsvpForm } from "./rsvp-form";

// A personal link: it names a guest, so it is never indexed and is never sent to another site as a referrer.
// ("same-origin" rather than "no-referrer": with no-referrer a browser posts forms with the origin "null",
// and Next rightly refuses such a Server Action request, which would break the form without JavaScript.)
export const metadata: Metadata = {
  title: "Your invitation",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

type Props = PageProps<"/i/[token]">;

// Everything on this page depends on one read of the guest's invitation, made fresh on every visit (opening
// it is what marks the invitation as opened), so there is nothing to put in a static shell: the route waits
// for the read and says so to Next with instant = false. Unlike the event page this one cannot be
// prerendered, so in production Next sends its static shell first and a link that does not work gets the
// not-found screen with status 200 and noindex (a soft 404). It never says whether a token exists, and
// the page is never cached (private, no-store).
export const instant = false;

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  const invitation = await openInvitation(token);
  if (!invitation) notFound();

  const { event, rsvp } = invitation;
  const attending = rsvp?.response === "attending";
  const name = firstName(invitation.guestName);

  return (
    <GuestShell theme={event.theme}>
      <header className="space-y-3">
        {attending ? (
          <StatusChip tone="success" icon={<Check className="size-4" aria-hidden="true" />}>
            You are confirmed · {partyLabel(rsvp.partySize)}
          </StatusChip>
        ) : rsvp ? (
          <StatusChip tone="neutral" icon={<Heart className="size-4" aria-hidden="true" />}>
            You replied: cannot come
          </StatusChip>
        ) : invitation.rsvpOpen ? (
          <StatusChip tone="gold">You are invited</StatusChip>
        ) : (
          <StatusChip tone="neutral" icon={<Hourglass className="size-4" aria-hidden="true" />}>
            Replies closed
          </StatusChip>
        )}
        <p className="pt-2 text-lg text-muted">
          Hi {name}, {greeting(invitation)}
        </p>
        <h1 className="font-display text-4xl leading-tight font-semibold break-words sm:text-5xl" style={headingStyle(event.theme)}>
          {event.name}
        </h1>
      </header>

      <div className="mt-8 space-y-6">
        {attending && rsvp ? <ConfirmedView invitation={invitation} token={token} /> : null}
        {rsvp && !attending ? <DeclinedView invitation={invitation} token={token} /> : null}
        {!rsvp ? <NoAnswerYet invitation={invitation} token={token} /> : null}
      </div>
    </GuestShell>
  );
}

function greeting({ rsvp, rsvpOpen }: Invitation): string {
  if (rsvp?.response === "attending") return "we will see you at";
  if (rsvp) return "thank you for letting us know about";
  return rsvpOpen ? "you are invited to" : "you were invited to";
}

function StatusChip({ tone, icon, children }: { tone: "gold" | "success" | "neutral"; icon?: React.ReactNode; children: React.ReactNode }) {
  const styles = {
    gold: "border-gold/30 bg-gold/10 text-gold",
    success: "border-success/30 bg-success/10 text-success",
    neutral: "border-line-strong bg-panel text-muted",
  } as const;
  return (
    <p className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase ${styles[tone]}`}>
      {icon}
      {children}
    </p>
  );
}

function FactsCard({ invitation }: { invitation: Invitation }) {
  return (
    <Card className="p-6 sm:p-8">
      <EventFacts event={invitation.event} />
    </Card>
  );
}

function ConfirmedView({ invitation, token }: { invitation: Invitation; token: string }) {
  const { event, rsvp } = invitation;
  if (!rsvp) return null;
  return (
    <>
      <Pass
        token={token}
        guestName={invitation.guestName}
        tableNo={invitation.tableNo}
        partySize={rsvp.partySize}
        eventName={event.name}
        timeZone={event.timezone}
        checkedInAt={invitation.checkedInAt}
      />
      <ActionCards cards={invitationCards({ token, event, ended: !invitation.rsvpOpen })} />
      <FactsCard invitation={invitation} />
      {invitation.rsvpOpen ? <ChangeAnswer token={token} existing={rsvp} /> : <EndedNote />}
    </>
  );
}

function DeclinedView({ invitation, token }: { invitation: Invitation; token: string }) {
  const { rsvp } = invitation;
  if (!rsvp) return null;
  return (
    <>
      <Card className="p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">We will miss you</h2>
        <p className="mt-2 text-muted">
          Your host knows you cannot make it.
          {invitation.rsvpOpen ? " If your plans change, you can update your answer until the event is over." : ""}
        </p>
      </Card>
      {invitation.rsvpOpen ? <ChangeAnswer token={token} existing={rsvp} /> : null}
      <FactsCard invitation={invitation} />
    </>
  );
}

function NoAnswerYet({ invitation, token }: { invitation: Invitation; token: string }) {
  return (
    <>
      <FactsCard invitation={invitation} />
      {invitation.rsvpOpen ? (
        <Card className="p-6 sm:p-8">
          <RsvpForm token={token} existing={null} submitLabel="Send my answer" />
        </Card>
      ) : (
        <EndedNote />
      )}
      <ActionCards cards={invitationCards({ token, event: invitation.event, ended: !invitation.rsvpOpen })} />
    </>
  );
}

function EndedNote() {
  return (
    <Card className="flex gap-4 p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold" aria-hidden="true">
        <Hourglass className="size-5" />
      </span>
      <p className="text-muted">This event has ended, so replies are closed.</p>
    </Card>
  );
}
