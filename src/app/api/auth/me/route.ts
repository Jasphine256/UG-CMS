import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { getUserRoles } from "@/lib/auth/rbac";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true, status: true },
  });

  if (!user) return apiUnauthorized("User not found");

  const roles = await getUserRoles(user.id);
  const roleSlugs = roles.map((ur) => ur.role.slug);

  return apiSuccess({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    jobTitle: user.jobTitle,
    status: user.status,
    roles: roleSlugs,
  });
}
