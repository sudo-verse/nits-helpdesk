import * as Sentry from "@sentry/nextjs";

/**
 * Runs once per server/edge runtime start. Split by NEXT_RUNTIME because the
 * Node and Edge Sentry SDKs are different bundles — importing the wrong one
 * for a runtime either no-ops or crashes the function.
 *
 * No-ops entirely when SENTRY_DSN is unset, so this is safe to ship even
 * before a Sentry project exists.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
      // Off by default — this app moves file uploads and Supabase session
      // tokens through Server Actions; sending request bodies to a third
      // party needs to be an opt-in decision, not a default.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
    });
  }
}

/**
 * Captures errors thrown by Server Components, Route Handlers and Server
 * Actions that Next.js's own error boundaries never see — this is the only
 * hook that reaches an error thrown *during* the RSC render/stream itself
 * rather than after it reaches the client.
 */
export const onRequestError = Sentry.captureRequestError;
