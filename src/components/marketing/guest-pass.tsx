import { QrArt } from "./qr-art";

/** Hero artwork: a sample guest pass, the thing that gets scanned at the door. */
export function GuestPass() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-linear-to-br from-neon-pink/25 via-neon-violet/20 to-neon-cyan/25 blur-2xl" />
      <div className="rounded-3xl border border-line bg-panel/90 p-1.5 shadow-2xl shadow-black/50">
        <div className="rounded-[1.25rem] border border-line/70 bg-linear-to-b from-panel-raised to-panel p-6">
          <div className="flex items-center justify-between text-xs font-medium tracking-[0.18em] text-muted uppercase">
            <span>Guest pass</span>
            <span className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">Sample</span>
          </div>

          <p className="mt-6 font-display text-2xl font-semibold tracking-tight">Your event name</p>
          <p className="mt-1 text-sm text-muted">Venue, city · Date and time</p>

          <div className="mt-6 flex justify-center rounded-2xl bg-fg p-4 text-ink">
            <QrArt className="size-44" />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted uppercase">Guest</dt>
              <dd className="mt-1 font-medium">Guest name</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.14em] text-muted uppercase">Table</dt>
              <dd className="mt-1 font-medium">12</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-neon-lime/30 bg-neon-lime/10 px-3 py-2 text-sm font-medium text-neon-lime">
            <span className="size-2 rounded-full bg-neon-lime" />
            Checked in at the door
          </div>
        </div>
      </div>
    </div>
  );
}
