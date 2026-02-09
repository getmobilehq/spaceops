"use client";

import { Button } from "@/components/ui/button";

export default function InspectionsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <Button onClick={reset} variant="secondary" size="sm">
        Try Again
      </Button>
    </div>
  );
}
