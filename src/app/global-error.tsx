"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort boundary for an error thrown by the root layout itself, where
 * even the normal error.tsx boundary has nothing left to render inside.
 * Replaces the entire document, so — deliberately — it doesn't depend on
 * globals.css, fonts, or Providers: if the layout is what broke, those may be
 * exactly what's unavailable.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#666", marginBottom: "16px" }}>
            The page could not be loaded. Try refreshing.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
