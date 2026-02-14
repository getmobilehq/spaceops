"use client";

import { Button } from "@/components/ui/button";

export default function AuditLogError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-muted-foreground">
        Failed to load audit log
      </p>
      <Button onClick={reset} variant="secondary" size="sm">
        Try Again
      </Button>
    </div>
  );
}
