import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuizPlayer } from "@/components/games/quiz-player";
import { ThemeScope } from "@/components/games/theme-scope";
import { getGameGuest } from "@/lib/games/guest";

export const metadata: Metadata = {
  title: "Live quiz",
  robots: { index: false, follow: false },
};

export const instant = true;

export default function PlayPage(props: PageProps<"/i/[token]/play">) {
  return (
    <Suspense fallback={<PlaySkeleton />}>
      <Play params={props.params} />
    </Suspense>
  );
}

function PlaySkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-5" aria-hidden="true">
      <div className="h-12 w-48 animate-pulse rounded-2xl bg-panel" />
      <div className="mx-auto mt-16 size-24 animate-pulse rounded-full bg-panel" />
      <div className="mx-auto h-8 w-56 animate-pulse rounded-xl bg-panel" />
    </div>
  );
}

async function Play({ params }: { params: PageProps<"/i/[token]/play">["params"] }) {
  const { token } = await params;
  const guest = await getGameGuest(token);
  // Unknown token, draft event: the same 404.
  if (!guest) notFound();

  return (
    <ThemeScope theme={guest.theme} className="flex min-h-dvh flex-col">
      <QuizPlayer token={token} playKey={guest.playKey} firstName={guest.name.trim().split(/\s+/)[0]} eventName={guest.eventName} />
      <p className="pb-8 text-center text-sm">
        <Link href={`/i/${token}`} className="text-muted underline">
          Back to my invitation
        </Link>
      </p>
    </ThemeScope>
  );
}
