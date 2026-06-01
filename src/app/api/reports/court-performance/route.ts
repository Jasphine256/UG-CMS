import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "REPORT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const courts = await prisma.court.findMany({ where: { isActive: true }, select: { id:true, name:true, code:true } });
  const data = await Promise.all(courts.map(async c => {
    const [total, active, closed, hearings] = await Promise.all([
      prisma.case.count({ where: { courtId: c.id } }),
      prisma.case.count({ where: { courtId: c.id, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
      prisma.case.count({ where: { courtId: c.id, caseStatus: { in: ["CLOSED","DISMISSED"] } } }),
      prisma.hearing.count({ where: { courtId: c.id } }),
    ]);
    return { id:c.id, name:c.name, code:c.code, total, active, closed, hearings, clearanceRate: closed+active>0 ? Math.round((closed/(closed+active))*100) : 0 };
  }));

  return apiSuccess(data.filter(c => c.total > 0));
}
