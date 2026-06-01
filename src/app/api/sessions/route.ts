import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "COURT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [sessions, total] = await Promise.all([
    prisma.courtSession.findMany({
      where,
      include: {
        court: { select: { id: true, name: true, code: true } },
        presidingJudge: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { hearings: true } },
      },
      skip, take: limit,
      orderBy: { startDate: "desc" },
    }),
    prisma.courtSession.count({ where }),
  ]);

  return apiPaginated(sessions, total, page, limit);
}
