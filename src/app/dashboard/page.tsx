import { Suspense } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { CONTACT_EMAIL } from "@/lib/site";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your events</h1>
        <Suspense fallback={<p className="mt-2 h-6" aria-hidden="true" />}>
          <Welcome />
        </Suspense>
      </div>

      <Card className="flex flex-col items-start gap-5 p-8 sm:p-10">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">No events yet</h2>
          <p className="max-w-xl text-muted">
            Creating and managing events from here is the next thing we are building. Until it lands, tell us about
            your event and we will set it up with you.
          </p>
        </div>
        <a href={`mailto:${CONTACT_EMAIL}?subject=My%20event`} className={buttonStyles()}>
          Email {CONTACT_EMAIL}
        </a>
      </Card>
    </div>
  );
}

async function Welcome() {
  const user = await requireUser();
  return <p className="mt-2 text-muted">Signed in as {user.email ?? "your account"}.</p>;
}
