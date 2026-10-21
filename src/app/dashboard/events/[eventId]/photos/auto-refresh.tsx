"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Asks the server for fresh data now and then while the page is on screen, so new photos show up without a reload. */
export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);

  return null;
}
