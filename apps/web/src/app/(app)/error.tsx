"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="max-w-xl mx-auto mt-20">
      <Card className="space-y-4">
        <CardTitle className="text-red">Something broke</CardTitle>
        <CardHint>{error.message || "Unexpected error."}</CardHint>
        {error.digest && <p className="num text-xs text-fg-faint">{error.digest}</p>}
        <Button phase="ghost" onClick={() => retry()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
