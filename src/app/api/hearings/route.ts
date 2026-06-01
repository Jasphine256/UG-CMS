import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const date = request.nextUrl.searchParams.get("date") || undefined;
  const courtId = request.nextUrl.searchParams.get("courtId") || undefined;

  const where: Record<string, unknown> = {};
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    where.hearingDate = { gte: d, lt: next };
  }
  if (courtId) where.courtId = courtId;

  const [hearings, total] = await Promise.all([
    prisma.hearing.findMany({
      where,
      include: {
        case: { select: { id: true, caseNumber: true, title: true, caseType: true } },
        court: { select: { id: true, name: true } },
        courtSession: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      skip, take: limit,
      orderBy: { hearingDate: "asc" },
    }),
    prisma.hearing.count({ where }),
  ]);

  return apiPaginated(hearings, total, page, limit);
}
