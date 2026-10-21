import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { AccountMenu } from "./account-menu";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · all41" },
  robots: { index: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/60 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo href="/dashboard" />
          <Suspense fallback={<div className="h-10 w-28" aria-hidden="true" />}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    </div>
  );
}
