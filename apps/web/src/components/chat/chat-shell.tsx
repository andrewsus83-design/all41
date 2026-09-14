"use client";
import { BuildClient } from "@/components/build/build-client";
import { ExploreGallery } from "@/components/explore/explore-gallery";
import type { CatalogApp } from "@/components/apps/types";
import type { PastTask } from "@/components/apps/task-view";

/** The Explore surface. No deep link → the discovery gallery (one big panel).
 * A picked app (?app) or a past result (?task) → the focused run flow. */
export function ChatShell({ apps, preselect, task, balance }: { apps: CatalogApp[]; preselect: string | null; task: PastTask | null; balance: number }) {
  const deepLink = !!preselect || !!task;

  if (!deepLink) return <ExploreGallery apps={apps} />;

  return (
    <div className="w-full">
      <BuildClient apps={apps} preselect={preselect} task={task} balance={balance} basePath="/chat" solo />
    </div>
  );
}
