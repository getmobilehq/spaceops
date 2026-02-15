"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-sm text-muted-foreground">
        Something went wrong loading schedules
      </p>
      <Button onClick={reset} variant="secondary" size="sm">
        Try Again
      </Button>
    </div>
  );
}
