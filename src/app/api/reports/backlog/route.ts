import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "REPORT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const now = new Date();
  const t30 = new Date(now); t30.setDate(t30.getDate()-30);
  const t90 = new Date(now); t90.setDate(t90.getDate()-90);
  const t180 = new Date(now); t180.setDate(t180.getDate()-180);
  const t365 = new Date(now); t365.setFullYear(t365.getFullYear()-1);

  const [t30d, t90d, t180d, t365d, older] = await Promise.all([
    prisma.case.count({ where: { filingDate: { gte: t30 }, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
    prisma.case.count({ where: { filingDate: { gte: t90, lt: t30 }, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
    prisma.case.count({ where: { filingDate: { gte: t180, lt: t90 }, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
    prisma.case.count({ where: { filingDate: { gte: t365, lt: t180 }, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
    prisma.case.count({ where: { filingDate: { lt: t365 }, caseStatus: { notIn: ["CLOSED","DISMISSED","WITHDRAWN"] } } }),
  ]);

  const totalBacklog = t30d + t90d + t180d + t365d + older;
  const totalCases = await prisma.case.count();
  const closedCases = await prisma.case.count({ where: { caseStatus: { in: ["CLOSED","DISMISSED","WITHDRAWN"] } } });

  return apiSuccess({
    totalBacklog, totalCases, closedCases,
    backlog: [
      { range: "0-30 days", count: t30d },
      { range: "31-90 days", count: t90d },
      { range: "91-180 days", count: t180d },
      { range: "181-365 days", count: t365d },
      { range: "1+ year", count: older },
    ],
    backlogRate: totalCases > 0 ? Math.round((totalBacklog/totalCases)*100) : 0,
  });
}
