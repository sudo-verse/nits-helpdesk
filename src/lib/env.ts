import { z } from "zod";

/**
 * Fail fast and loudly on a missing variable at boot, rather than with an
 * opaque "Invalid API key" from Supabase three layers deep at request time.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks empty"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

// Next.js inlines NEXT_PUBLIC_* at build time only for statically analysable
// member expressions, so they must be written out in full — destructuring
// `process.env` or indexing it dynamically yields undefined in the browser.
export const env = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

/**
 * Server-only secrets. Calling this from a Client Component throws instead of
 * silently shipping `undefined` — or worse, the value itself.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser. This is a bug.");
  }
  return z
    .object({
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    })
    .parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
}
