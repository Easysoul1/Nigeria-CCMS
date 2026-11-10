import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Only the staff console is protected. Everything else (including unknown
 * paths) must reach the router so Next can render the public 404 page instead
 * of bouncing an anonymous visitor to /login.
 */
const PROTECTED_PREFIXES = ["/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession =
    Boolean(req.cookies.get("access_token")?.value) || Boolean(req.cookies.get("refresh_token")?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // A stale access token is fine: the client refreshes it silently on the
  // first request. Only a completely absent session is bounced.
  if (!hasSession && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
