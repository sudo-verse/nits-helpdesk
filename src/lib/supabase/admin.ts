import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Service-role client. **Bypasses every RLS policy.**
 *
 * Legitimate uses are narrow: provisioning users in seed scripts and reading
 * aggregate figures that deliberately span all users. Never reach for this to
 * work around a policy that is inconvenient — if a query needs it, the policy
 * is usually the thing that is wrong.
 *
 * The `server-only` import above makes importing this from a Client Component
 * a build error rather than a leaked credential.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
