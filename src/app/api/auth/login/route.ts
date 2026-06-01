import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken } from "@/lib/auth/auth";
import { setSessionCookie, setRefreshCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/response";
import { getUserRoles } from "@/lib/auth/rbac";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid credentials format");
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== "ACTIVE") {
      return apiUnauthorized("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiUnauthorized("Invalid email or password");
    }

    const userRoles = await getUserRoles(user.id);
    const roleSlugs = userRoles.map((ur) => ur.role.slug);
    const sessionId = randomUUID();

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles: roleSlugs,
      sessionId,
    });
    const refreshToken = signRefreshToken({ userId: user.id, sessionId });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = apiSuccess({
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleSlugs,
      },
    });

    response.cookies.set(setSessionCookie(accessToken));
    response.cookies.set(setRefreshCookie(refreshToken));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Internal server error", 500);
  }
}
