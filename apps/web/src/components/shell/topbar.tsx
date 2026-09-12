import Link from "next/link";
import { Money } from "@/components/ui/money";

export function Topbar({ email, balance }: { email: string; balance: number }) {
  return (
    <header className="h-20 border-b border-line flex items-center justify-between px-10 gap-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-fg-muted">Credit</span>
        <Money usd={balance} className="text-2xl" />
        <Link href="/settings/billing" className="text-sm text-green hover:underline">
          Top up
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-fg-muted">{email}</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-fg-faint hover:text-fg transition">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
