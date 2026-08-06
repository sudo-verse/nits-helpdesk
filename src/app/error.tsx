"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production the message is redacted to a digest here; the full error
    // with stack trace was already captured server-side by onRequestError in
    // instrumentation.ts, and Sentry links the two via the digest. Logging it
    // too so the server trace can be correlated without leaving this tab.
    console.error("[error boundary]", error.digest ?? error.message);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <EmptyState
        icon="error"
        tone="error"
        title="Something went wrong"
        description="This page could not be loaded. Trying again usually helps — if it keeps happening, let the helpdesk team know."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset} icon="refresh">Try again</Button>
            <ButtonLink href="/dashboard" variant="secondary" icon="home">
              Go home
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
