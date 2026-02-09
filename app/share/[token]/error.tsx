"use client";

import { Button } from "@/components/ui/button";

export default function SharedDashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <Button onClick={reset} variant="secondary" size="sm">
        Try Again
      </Button>
    </div>
  );
}
