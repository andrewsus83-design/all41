import Link from "next/link";
import type { ReactNode } from "react";
import type { EventTheme } from "@/lib/events/theme";
import { resolveAccent } from "@/lib/events/theme";
import { ThemeScope } from "./theme-scope";

/**
 * The frame of every guest page: the event's colors, a soft glow in its accent at the
 * top, a centered column that is comfortable on a phone and on a laptop, and a quiet
 * "made with all41" at the bottom.
 */
export function GuestShell({ theme, children }: { theme: EventTheme; children: ReactNode }) {
  return (
    <ThemeScope theme={theme} className="relative isolate flex flex-col overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-40"
        style={{ background: `radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, ${resolveAccent(theme)} 55%, transparent), transparent)` }}
      />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-10 pb-10 sm:px-6 sm:pt-16">{children}</main>
      <footer className="px-4 pb-8 text-center text-xs text-subtle">
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-muted">
          Made with all41
        </Link>
      </footer>
    </ThemeScope>
  );
}
