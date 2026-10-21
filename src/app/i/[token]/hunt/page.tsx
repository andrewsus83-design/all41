import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HuntPlayer } from "@/components/games/hunt-player";
import { ThemeScope } from "@/components/games/theme-scope";
import { getGameGuest, getHuntBoard } from "@/lib/games/guest";
import { extractMissionCode } from "@/lib/games/links";

export const metadata: Metadata = {
  title: "Scavenger hunt",
  robots: { index: false, follow: false },
};

export const instant = true;

type Props = PageProps<"/i/[token]/hunt">;

export default function HuntPage(props: Props) {
  return (
    <Suspense fallback={<HuntSkeleton />}>
      <Hunt params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function HuntSkeleton() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-5" aria-hidden="true">
      <div className="h-12 w-48 animate-pulse rounded-2xl bg-panel" />
      <div className="h-44 animate-pulse rounded-[2rem] bg-panel" />
      <div className="h-24 animate-pulse rounded-[1.5rem] bg-panel" />
      <div className="h-24 animate-pulse rounded-[1.5rem] bg-panel" />
    </div>
  );
}

async function Hunt({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { token } = await params;
  const { code } = await searchParams;
  const [guest, board] = await Promise.all([getGameGuest(token), getHuntBoard(token)]);
  // Unknown token, draft event: the same 404.
  if (!guest || !board) notFound();

  return (
    <ThemeScope theme={guest.theme} className="flex min-h-dvh flex-col">
      <HuntPlayer
        token={token}
        playKey={guest.playKey}
        eventName={guest.eventName}
        initialBoard={board}
        autoCode={typeof code === "string" ? (extractMissionCode(code) ?? undefined) : undefined}
      />
      <p className="pb-28 text-center text-sm">
        <Link href={`/i/${token}`} className="text-muted underline">
          Back to my invitation
        </Link>
      </p>
    </ThemeScope>
  );
}
