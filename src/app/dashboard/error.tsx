"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">We could not load this page. It is usually a brief hiccup, so try again in a moment.</p>
      <Button onClick={() => retry()}>Try again</Button>
    </Card>
  );
}
