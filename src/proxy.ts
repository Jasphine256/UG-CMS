import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "ug-cms-session";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
];

const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|eot)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, Next.js internals, and root
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_EXTENSIONS.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Only protect dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
