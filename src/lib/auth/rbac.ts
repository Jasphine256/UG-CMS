import { prisma } from "@/lib/prisma/client";

export interface UserRoleWithRole {
  id: string;
  userId: string;
  roleId: string;
  courtId: string | null;
  assignedAt: Date;
  role: { id: string; name: string; slug: string; description: string | null; hierarchy: number; isSystem: boolean; createdAt: Date; updatedAt: Date };
  court: { id: string; name: string; code: string } | null;
}

interface PermissionCheckContext {
  courtId?: string;
  caseId?: string;
}

export async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  context?: PermissionCheckContext,
): Promise<boolean> {
  // Admin always has full access
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      ...(context?.courtId ? { courtId: context.courtId } : {}),
    },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  // Check if user has admin role (system-wide)
  const hasAdmin = userRoles.some(
    (ur) => ur.role.slug === "system_administrator" && !ur.courtId
  );
  if (hasAdmin) return true;

  // Check specific permission
  return userRoles.some((ur) =>
    ur.role.permissions.some(
      (rp) =>
        rp.permission.resource === resource &&
        rp.permission.action === action
    )
  );
}

export async function requirePermission(
  userId: string,
  resource: string,
  action: string,
  context?: PermissionCheckContext,
): Promise<void> {
  const allowed = await checkPermission(userId, resource, action, context);
  if (!allowed) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}

export async function getUserRoles(userId: string): Promise<UserRoleWithRole[]> {
  return prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
      court: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function getUserPermissions(userId: string) {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  const permissions = new Set<string>();
  for (const ur of roles) {
    for (const rp of ur.role.permissions) {
      permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
    }
  }
  return Array.from(permissions);
}
