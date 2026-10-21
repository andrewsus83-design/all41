"use client";

import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Result = { error?: string } | void;

/**
 * A button that runs a Server Action and shows its error right beside it. With `confirm` the
 * first press asks "Are you sure?" instead of acting, so a stray tap cannot delete anything.
 */
export function ActionButton({
  action,
  children,
  confirm,
  className = "",
  ...props
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  /** The question to ask before acting, for example "Delete this question?". */
  confirm?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "children">) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setAsking(false);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && result.error) setError(result.error);
    });
  }

  if (asking) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label={confirm}>
        <span className="text-sm font-bold">{confirm}</span>
        <Button {...props} className={className} onClick={run} disabled={pending}>
          Yes
        </Button>
        <Button variant="ghost" onClick={() => setAsking(false)}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Button {...props} className={className} disabled={pending || props.disabled} onClick={confirm ? () => setAsking(true) : run}>
        {children}
      </Button>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
