import { Card } from "@/components/ui/card";

interface Phase {
  id: string;
  label: string;
  title: string;
  blurb: string;
  building: string[];
  next: string[];
}

const PHASES: Phase[] = [
  {
    id: "before",
    label: "Before",
    title: "Invite",
    blurb: "A page for the event, an invitation for every guest and an answer from each of them.",
    building: [
      "Event landing page on your own all41 address",
      "Personal invitation link and QR code for each guest",
      "RSVP with plus-ones, meal preference and your own questions",
      "Invitations and reminders by email",
    ],
    next: ["WhatsApp invitations as an add-on"],
  },
  {
    id: "during",
    label: "During",
    title: "Check in",
    blurb: "Staff scan guests in from any phone, and you watch the room fill up.",
    building: ["QR check-in from a phone browser, nothing to install", "Live attendance count and guest status"],
    next: ["Live quiz and scavenger hunt", "Raffle drawn from guests who checked in", "Live photo wall"],
  },
  {
    id: "after",
    label: "After",
    title: "Remember",
    blurb: "Keep what happened and share it.",
    building: ["Attendance report you can export"],
    next: ["Shared photo album for every guest", "Content ready for social media"],
  },
];

function Item({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-2 size-1.5 shrink-0 rounded-full ${muted ? "bg-line" : "bg-neon-cyan"}`}
      />
      <span className={muted ? "text-muted" : "text-fg"}>{children}</span>
    </li>
  );
}

export function Lifecycle() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium tracking-[0.18em] text-gold uppercase">One platform</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Before, during and after your event
        </h2>
        <p className="mt-4 text-lg text-muted">
          We are building all41 in the open, one piece at a time. This is what is being built now and what comes
          next.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PHASES.map((phase) => (
          <Card key={phase.id} className="flex flex-col p-6 sm:p-7">
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">{phase.label}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{phase.title}</h3>
            <p className="mt-2 text-muted">{phase.blurb}</p>

            <h4 className="mt-6 text-xs font-medium tracking-[0.14em] text-neon-cyan uppercase">Building now</h4>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
              {phase.building.map((text) => (
                <Item key={text}>{text}</Item>
              ))}
            </ul>

            <h4 className="mt-6 text-xs font-medium tracking-[0.14em] text-muted uppercase">Coming next</h4>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
              {phase.next.map((text) => (
                <Item key={text} muted>
                  {text}
                </Item>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
