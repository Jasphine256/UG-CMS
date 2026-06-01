import { cookies } from "next/headers";
import { verifyAccessToken, type JWTPayload } from "./auth";

const SESSION_COOKIE = "ug-cms-session";
const REFRESH_COOKIE = "ug-cms-refresh";

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function setSessionCookie(token: string, maxAge = 900) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setRefreshCookie(token: string) {
  return {
    name: REFRESH_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/refresh",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearSessionCookies() {
  return [
    { name: SESSION_COOKIE, value: "", maxAge: 0, httpOnly: true, secure: false, sameSite: "lax" as const, path: "/" },
    { name: REFRESH_COOKIE, value: "", maxAge: 0, httpOnly: true, secure: false, sameSite: "lax" as const, path: "/api/auth/refresh" },
  ];
}
