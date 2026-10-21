import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenMyGame } from "@/components/games/open-my-game";
import { isPlayKeyShaped } from "@/lib/games/shared-state";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Join the quiz", robots: { index: false, follow: false } };

export default function JoinPage(props: PageProps<"/play/[playKey]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <Suspense fallback={<p className="text-muted">One moment…</p>}>
        <Join params={props.params} />
      </Suspense>
    </main>
  );
}

async function Join({ params }: { params: PageProps<"/play/[playKey]">["params"] }) {
  const { playKey } = await params;
  if (!isPlayKeyShaped(playKey)) notFound();
  return <OpenMyGame playKey={playKey} to="play" label="The live quiz" />;
}
