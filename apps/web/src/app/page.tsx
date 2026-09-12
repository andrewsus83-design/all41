import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-2xl space-y-8 text-center">
        <div className="font-title text-2xl">all41</div>
        <h1 className="text-5xl md:text-6xl font-semibold leading-[1.05]">You describe the job. all41 does the rest.</h1>
        <p className="text-xl text-fg-muted">Optimizes your context, picks the right model, executes the task, and tracks the cost. One chat. Done.</p>
        <p className="reflect text-fg-muted">Other AI tools let you be lazy. all41 makes you sharp.</p>
        <div className="flex justify-center gap-4">
          <Link href="/login"><Button phase="green" size="lg">Start with $2 free</Button></Link>
        </div>
        <p className="text-sm text-fg-faint">Pay per task in plain dollars. No subscriptions. No API keys.</p>
      </div>
    </main>
  );
}
