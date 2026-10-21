import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/proxy";

const AUTH_PAGES = new Set(["/login", "/signup"]);

/** Redirects keep any refreshed session cookies and are never cached. */
function redirectTo(url: URL, from: NextResponse) {
  const response = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) response.cookies.set(cookie);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Refreshes the Supabase session and does the optimistic redirects: signed-out
 * visitors leave the dashboard, signed-in ones skip the login and signup pages.
 * It is not the security boundary. Pages, actions and row level security check
 * the user again close to the data.
 */
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search, searchParams } = request.nextUrl;

  // Server Actions are POSTs to the page they live on. Those pass through and
  // check the session themselves.
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  if (!claims && pathname.startsWith("/dashboard")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return redirectTo(login, response);
  }

  if (claims && AUTH_PAGES.has(pathname)) {
    return redirectTo(new URL(safeNextPath(searchParams.get("next")), request.url), response);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
