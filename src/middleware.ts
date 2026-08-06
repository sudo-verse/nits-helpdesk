import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Reachable without a session. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth", "/privacy", "/terms"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refreshing the session on every request is the whole reason this
  // middleware exists — Server Components cannot write the rotated cookie.
  const { response, user } = await updateSession(request);

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were heading so login can return them there.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // A signed-in user hitting the login screen belongs at their landing page —
  // forwarding `next` handles a stale tab or shared link still carrying one.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = "/auth/post-login";
    url.search = next ? `next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Note middleware is a
     * convenience layer for redirects — it is NOT the security boundary.
     * Authorisation is enforced by requireUser() in each route and, ultimately,
     * by RLS in the database.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
