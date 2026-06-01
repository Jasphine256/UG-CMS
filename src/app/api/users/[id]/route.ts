import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, otherNames: true,
      phoneNumber: true, nationalId: true, barNumber: true, badgeNumber: true,
      jobTitle: true, status: true, isVerified: true, lastLoginAt: true, avatarUrl: true,
      createdAt: true, updatedAt: true,
      roles: { include: { role: { select: { id: true, name: true, slug: true } }, court: { select: { id: true, name: true, code: true } } } },
    },
  });
  if (!user) return apiNotFound("User not found");
  return apiSuccess(user);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const body = await request.json();
  const { firstName, lastName, email, phoneNumber, nationalId, jobTitle, barNumber, badgeNumber } = body;

  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, email, phoneNumber, nationalId, jobTitle, barNumber, badgeNumber },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  await logAudit(session.userId, "USER_UPDATED", "USER", id, { newValue: body });

  return apiSuccess(user);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "DELETE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  if (id === session.userId) return apiError("Cannot delete your own account");

  await prisma.user.update({ where: { id }, data: { status: "DEACTIVATED" } });
  await logAudit(session.userId, "USER_DEACTIVATED", "USER", id);

  return apiSuccess({ message: "User deactivated" });
}
