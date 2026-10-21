"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/button";

/** Copies text to the clipboard. Falls back to a hidden textarea where the Clipboard API is missing, such as plain http. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * A button that copies `value` and says so. `label` is what a screen reader hears
 * (for example "Copy invitation link for Dewi"); `children` is the visible text.
 */
export function CopyLinkButton({
  value,
  label,
  children = "Copy link",
  variant = "secondary",
  className = "",
}: {
  value: string;
  label?: string;
  children?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    setState((await copyText(value)) ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <>
      <button type="button" onClick={copy} aria-label={label} className={`${buttonStyles({ variant })} ${className}`}>
        {state === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : children}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Link copied to the clipboard." : state === "failed" ? "Could not copy the link." : ""}
      </span>
    </>
  );
}
