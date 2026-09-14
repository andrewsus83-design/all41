"use client";
import { useEffect, useState } from "react";
import { BuildClient } from "@/components/build/build-client";
import { ChatIntro } from "./chat-intro";
import type { CatalogApp } from "@/components/apps/types";
import type { PastTask } from "@/components/apps/task-view";

/** The Chat surface: a skippable one-time intro, then the always-active AI chat (AI asks, you answer). */
export function ChatShell({ apps, preselect, task, balance }: { apps: CatalogApp[]; preselect: string | null; task: PastTask | null; balance: number }) {
  const deepLink = !!preselect || !!task; // arrived for a specific app or result → skip the intro
  const [started, setStarted] = useState(deepLink);

  useEffect(() => {
    if (deepLink) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (localStorage.getItem("all41-chat-intro") === "1") setStarted(true); } catch { /* private mode */ }
  }, [deepLink]);

  const begin = () => {
    try { localStorage.setItem("all41-chat-intro", "1"); } catch { /* private mode */ }
    setStarted(true);
  };

  if (!started) return <ChatIntro onStart={begin} />;

  const greeting = (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center size-10 rounded-full bg-amber-soft text-amber font-title font-bold shrink-0">a</span>
      <div className="squircle rounded-4 bg-bg-elev border border-line px-5 py-4 space-y-1">
        <p className="text-lg font-title font-medium">Hi — what do you want to get done today?</p>
        <p className="text-sm text-fg-muted">Pick an app on the left, or tell me in your own words. I&apos;ll ask a few quick questions, run it once for real so you can see it, then it lands in your Home.</p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <BuildClient apps={apps} preselect={preselect} task={task} balance={balance} basePath="/chat" intro={greeting} />
    </div>
  );
}
