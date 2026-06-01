import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "AUDIT_LOG", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const resource = request.nextUrl.searchParams.get("resource") || undefined;
  const userId = request.nextUrl.searchParams.get("userId") || undefined;

  const where: Record<string, unknown> = {};
  if (resource) where.resource = resource;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      skip, take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return apiPaginated(logs, total, page, limit);
}
