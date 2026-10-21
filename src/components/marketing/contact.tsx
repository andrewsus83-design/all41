import { buttonStyles } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

export function ContactBand() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 bg-linear-to-br from-neon-violet/15 via-transparent to-neon-pink/15"
        />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Planning an event?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Tell us the date and the size of the guest list. We will reply with what you need.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}?subject=My%20event`} className={`${buttonStyles({ size: "lg" })} mt-8`}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </section>
  );
}
