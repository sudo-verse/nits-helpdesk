import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit, backed by the `rate_limits` table.
 *
 * Uses the admin client because the table intentionally has no RLS policy —
 * an anonymous visitor requesting an OTP has no session to check against, so
 * the limiter has to work before authentication exists.
 *
 * Returns true when the call is allowed. On an unexpected error it fails
 * **open**: a limiter outage should not lock every student out of signing in.
 * The trade-off is deliberate and only acceptable because this backs abuse
 * prevention, never authorisation.
 */
export async function checkRateLimit(
  key: string,
  maxHits: number,
  window: string,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_hits: maxHits,
      p_window: window,
    });

    if (error) {
      console.error("[rate-limit] check failed, allowing request", error.message);
      return true;
    }

    return data ?? true;
  } catch (error) {
    console.error("[rate-limit] unexpected failure, allowing request", error);
    return true;
  }
}
