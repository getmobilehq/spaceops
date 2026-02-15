"use client";

import { Button } from "@/components/ui/button";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
      <p className="text-sm text-muted-foreground">
        Something went wrong loading analytics
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        Try Again
      </Button>
    </div>
  );
}
