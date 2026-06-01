import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { getUserRoles } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
  const refreshCookie = request.cookies.get("ug-cms-refresh")?.value;
  if (!refreshCookie) return apiError("No refresh token", 401);

  try {
    const payload = verifyRefreshToken(refreshCookie);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.status !== "ACTIVE") {
      return apiError("Invalid session", 401);
    }

    const userRoles = await getUserRoles(user.id);
    const roleSlugs = userRoles.map((ur) => ur.role.slug);

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles: roleSlugs,
      sessionId: payload.sessionId,
    });

    const response = apiSuccess({ message: "Token refreshed" });
    response.cookies.set(setSessionCookie(accessToken));
    return response;
  } catch {
    return apiError("Invalid refresh token", 401);
  }
}
