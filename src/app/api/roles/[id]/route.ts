import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      users: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
      _count: { select: { users: true } },
    },
  });
  if (!role) return apiNotFound("Role not found");
  return apiSuccess(role);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { name, description, hierarchy } = await request.json();

  const role = await prisma.role.update({
    where: { id },
    data: { name, description, hierarchy },
  });

  await logAudit(session.userId, "ROLE_UPDATED", "ROLE", id, { newValue: { name, description, hierarchy } });

  return apiSuccess(role);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "DELETE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return apiNotFound();
  if (role.isSystem) return apiError("Cannot delete system roles");

  // Unassign all users from this role
  await prisma.userRole.deleteMany({ where: { roleId: id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });

  await logAudit(session.userId, "ROLE_DELETED", "ROLE", id);

  return apiSuccess({ message: "Role deleted" });
}
