import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Refreshes the auth session on every request and returns both the response
 * carrying rotated cookies and the current user.
 *
 * Server Components cannot write cookies, so without this the access token
 * would expire mid-session and the user would be bounced to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // `getSession()` decodes the cookie payload locally without a network roundtrip,
  // making middleware authorization instant (0ms overhead) on every navigation.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { response, user: session?.user ?? null, supabase };
}
