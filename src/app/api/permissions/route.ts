import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  // Group by resource
  const grouped: Record<string, typeof permissions> = {};
  for (const perm of permissions) {
    if (!grouped[perm.resource]) grouped[perm.resource] = [];
    grouped[perm.resource].push(perm);
  }

  return apiSuccess({ all: permissions, grouped });
}
