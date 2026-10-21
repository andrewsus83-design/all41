import { Card } from "@/components/ui/card";
import {
  EXTRA_GUEST_BLOCK_SIZE,
  MAX_SELF_SERVICE_GUESTS,
  PACKAGES,
  WHITE_LABEL_PRICE_IDR,
  formatIdr,
} from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";
import { PlanFinder } from "./plan-finder";

const number = (value: number) => value.toLocaleString("en-US");

export function Pricing() {
  const withExtraGuests = PACKAGES.filter((p) => p.extraGuestPriceIdr !== null);
  const cheapestWhatsApp = Math.min(...PACKAGES.flatMap((p) => (p.whatsappIdr ? [p.whatsappIdr.fonnte] : [])));

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium tracking-[0.18em] text-gold uppercase">Pricing</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          One flat price, set by your guest list
        </h2>
        <p className="mt-4 text-lg text-muted">
          You pay once per event, for the smallest package that holds your guests. Every package includes every feature.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <li key={pkg.tier}>
            <Card className="h-full p-6">
              <h3 className="text-sm font-medium tracking-[0.14em] text-muted uppercase">{pkg.name}</h3>
              <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
                {formatIdr(pkg.priceIdr)}
              </p>
              <p className="mt-2 text-muted">Up to {number(pkg.guestCapacity)} guests</p>
              {pkg.tier === "free" && <p className="mt-3 text-sm text-muted">One active event per account.</p>}
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="font-medium">Extra guests</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A few guests over the limit? Add them in blocks of {EXTRA_GUEST_BLOCK_SIZE} instead of upgrading:{" "}
            {withExtraGuests.map((p) => `${p.name} ${formatIdr(p.extraGuestPriceIdr ?? 0)}`).join(", ")} per guest.
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-medium">WhatsApp</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Send invitations and reminders by WhatsApp as an add-on, from {formatIdr(cheapestWhatsApp)} per event.
            Email is always included.
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-medium">White label</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your own domain and no all41 branding for {formatIdr(WHITE_LABEL_PRICE_IDR)} per event.
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <PlanFinder />
      </div>

      <p className="mt-6 text-sm text-muted">
        More than {number(MAX_SELF_SERVICE_GUESTS)} guests, or running events for clients?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline">
          Talk to us
        </a>
        . Prices are in Indonesian rupiah.
      </p>
    </section>
  );
}
