import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <Card className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="font-display text-2xl font-semibold">We could not find that</h1>
      <p className="text-muted">The event may have been removed, or the link is not quite right.</p>
      <Link href="/dashboard" className={buttonStyles()}>
        Back to your events
      </Link>
    </Card>
  );
}
