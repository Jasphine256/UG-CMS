import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: { select: { id: true, resource: true, action: true } } } },
    },
    orderBy: { hierarchy: "asc" },
  });

  return apiSuccess(roles);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "ROLE", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const body = await request.json();
  const { name, slug, description, hierarchy } = body;
  if (!name || !slug) return apiError("Name and slug are required");

  const existing = await prisma.role.findUnique({ where: { slug } });
  if (existing) return apiError("Role slug already exists");

  const role = await prisma.role.create({
    data: { name, slug, description, hierarchy: hierarchy || 50 },
  });

  await logAudit(session.userId, "ROLE_CREATED", "ROLE", role.id, { newValue: body });

  return apiSuccess(role, 201);
}
