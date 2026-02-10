"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>
            Something went wrong
          </h2>
          <button
            onClick={reset}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
