import { buttonStyles } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";
import { GuestPass } from "./guest-pass";

export function Hero() {
  return (
    <section className="backdrop-glow overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3.5 py-1.5 text-xs font-medium tracking-wide text-muted">
            <span className="size-1.5 rounded-full bg-neon-cyan" />
            For corporate events and weddings
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.03] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Everything you need for <span className="text-neon">your event.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted">
            From the first invitation to the last photo. One page for your guests, one guest list for your team and
            one QR code at the door.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={`mailto:${CONTACT_EMAIL}?subject=My%20event`} className={buttonStyles({ size: "lg" })}>
              Talk to us
            </a>
            <a href="#pricing" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              See pricing
            </a>
          </div>
          <p className="mt-5 text-sm text-muted">Free for up to 5 guests. After that, one flat price per event.</p>
        </div>
        <GuestPass />
      </div>
    </section>
  );
}
