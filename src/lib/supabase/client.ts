import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Browser client. Used for Realtime subscriptions and for reads inside Client
 * Components; every write goes through a Server Action instead.
 *
 * createBrowserClient memoises internally, so calling this per component is
 * fine and does not open duplicate sockets.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
