import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const roles = await prisma.userRole.findMany({
    where: { userId: id },
    include: { role: true, court: { select: { id: true, name: true, code: true } } },
  });
  return apiSuccess(roles);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: userId } = await params;
  const { roleId, courtId } = await request.json();
  if (!roleId) return apiError("roleId is required");

  // Check if already assigned
  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId_courtId: { userId, roleId, courtId: courtId || null } },
  });
  if (existing) return apiError("Role already assigned", 409);

  const userRole = await prisma.userRole.create({
    data: { userId, roleId, courtId: courtId || null },
  });

  await logAudit(session.userId, "USER_ROLE_ASSIGNED", "USER", userId, { newValue: { roleId, courtId } });

  return apiSuccess(userRole, 201);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: userId } = await params;
  const { roleId } = await request.json();
  if (!roleId) return apiError("roleId is required");

  await prisma.userRole.deleteMany({ where: { userId, roleId } });
  await logAudit(session.userId, "USER_ROLE_REMOVED", "USER", userId, { oldValue: { roleId } });

  return apiSuccess({ message: "Role removed" });
}
