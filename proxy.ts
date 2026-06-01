import { verifyAccessToken, signAccessToken } from "@/lib/auth/auth";
import { setSessionCookie, setRefreshCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/system/health"];

const ROLE_ROUTE_MAP: Record<string, string> = {
  system_administrator: "/admin",
  supreme_court_justice: "/dashboard",
  court_of_appeal_justice: "/dashboard",
  high_court_judge: "/dashboard",
  chief_magistrate: "/dashboard",
};

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.match(/\.(svg|png|jpg|ico)$/)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("ug-cms-session")?.value;
  const refreshCookie = request.cookies.get("ug-cms-refresh")?.value;

  // No session - redirect to login
  if (!sessionCookie) {
    if (refreshCookie) {
      try {
        const { default: jwt } = await import("jsonwebtoken");
        const payload = jwt.verify(refreshCookie, process.env.JWT_REFRESH_SECRET || "dev-refresh-secret") as {
          userId: string;
          sessionId: string;
        };

        const { prisma } = await import("@/lib/prisma/client");
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { roles: { include: { role: true } } },
        });

        if (user && user.status === "ACTIVE") {
          const roleSlugs = user.roles.map((ur: { role: { slug: string } }) => ur.role.slug);
          const newAccessToken = signAccessToken({
            userId: user.id,
            email: user.email,
            roles: roleSlugs,
            sessionId: payload.sessionId,
          });

          const response = NextResponse.next();
          response.cookies.set(setSessionCookie(newAccessToken));
          return response;
        }
      } catch {
        // Refresh failed, redirect to login
      }
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session
  try {
    const payload = verifyAccessToken(sessionCookie);
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId);
    response.headers.set("x-user-email", payload.email);
    response.headers.set("x-user-roles", payload.roles.join(","));
    return response;
  } catch {
    // Session expired, try refresh
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  runtime: "nodejs",
};
