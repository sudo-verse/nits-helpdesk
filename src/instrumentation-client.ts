import * as Sentry from "@sentry/nextjs";

// No-ops when unset — see src/instrumentation.ts for the server-side half.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    // Session Replay is expensive on a free/small quota and this app has no
    // pages where watching a user's session is worth the tradeoff yet.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
