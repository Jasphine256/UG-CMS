import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: roleId } = await params;
  const { permissionIds } = await request.json();
  if (!Array.isArray(permissionIds)) return apiError("permissionIds must be an array");

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return apiError("Role not found");

  // Replace all permissions atomically
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((pid) => ({ roleId, permissionId: pid })),
    });
  }

  await logAudit(session.userId, "ROLE_PERMISSIONS_UPDATED", "ROLE", roleId, { newValue: { permissionIds } });

  return apiSuccess({ message: `Updated ${permissionIds.length} permissions for role` });
}
