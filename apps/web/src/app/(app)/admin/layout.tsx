import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin(); // gate the entire /admin subtree
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-fg-muted text-sm">The all41 control plane — apps, keys, members, orgs, payments, inbox, graph and services. Every change is audit-logged.</p>
      </header>
      <AdminNav />
      {children}
    </div>
  );
}
