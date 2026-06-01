import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "REPORT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const [total, adjourned, withOutcome, byType] = await Promise.all([
    prisma.hearing.count(),
    prisma.hearing.count({ where: { isAdjourned: true } }),
    prisma.hearing.count({ where: { outcome: { not: null } } }),
    prisma.hearing.groupBy({ by: ["hearingType"], _count: true }),
  ]);

  return apiSuccess({
    total, adjourned, withOutcome,
    adjournmentRate: total>0 ? Math.round((adjourned/total)*100) : 0,
    byType: byType.map((i: { hearingType: string; _count: number }) => ({ type: i.hearingType, count: i._count })),
  });
}
