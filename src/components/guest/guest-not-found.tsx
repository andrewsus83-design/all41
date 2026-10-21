import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { GuestShell } from "./guest-shell";

/**
 * The one answer for an event address or invitation link that does not work. It never says why:
 * a made-up link, a draft event and an archived event all look the same to a guest.
 */
export function GuestNotFound() {
  return (
    <GuestShell theme={{ preset: "midnight", font: "modern" }}>
      <div className="flex flex-col items-center pt-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold" aria-hidden="true">
          <SearchX className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">We could not find that page</h1>
        <p className="mt-3 max-w-sm text-muted">
          The link may be mistyped, or the event may not be open yet. Open the link your host sent you again, or ask them to send it once more.
        </p>
        <Link href="/" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
          Go to all41
        </Link>
      </div>
    </GuestShell>
  );
}
