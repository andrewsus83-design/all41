import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** The frame around the sign-in and sign-up forms. Static, so it prerenders. */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-7 sm:p-9">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
      <p className="mt-8 text-center text-sm text-muted">{footer}</p>
    </Card>
  );
}

/** Same height as the form, so the card does not jump when the form streams in. */
export function AuthFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-[5.25rem] animate-pulse rounded-2xl bg-panel-raised" />
      <div className="h-[5.25rem] animate-pulse rounded-2xl bg-panel-raised" />
      <div className="h-12 animate-pulse rounded-full bg-panel-raised" />
    </div>
  );
}
