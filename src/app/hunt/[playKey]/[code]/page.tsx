import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OpenMyGame } from "@/components/games/open-my-game";
import { extractMissionCode } from "@/lib/games/links";
import { isPlayKeyShaped } from "@/lib/games/shared-state";

export const metadata: Metadata = { title: "Scavenger hunt", robots: { index: false, follow: false } };

export default function HuntLinkPage(props: PageProps<"/hunt/[playKey]/[code]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <Suspense fallback={<p className="text-muted">One moment…</p>}>
        <HuntLink params={props.params} />
      </Suspense>
    </main>
  );
}

async function HuntLink({ params }: { params: PageProps<"/hunt/[playKey]/[code]">["params"] }) {
  const { playKey, code } = await params;
  const normalized = extractMissionCode(code);
  if (!isPlayKeyShaped(playKey) || !normalized) notFound();
  return <OpenMyGame playKey={playKey} to="hunt" label="The scavenger hunt" code={normalized} />;
}
