import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "REPORT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const [total, byType, byStatus] = await Promise.all([
    prisma.case.count(),
    prisma.case.groupBy({ by: ["caseType"], _count: true }),
    prisma.case.groupBy({ by: ["caseStatus"], _count: true }),
  ]);

  const typeMap: Record<string, string> = { CRIMINAL:"Criminal", CIVIL:"Civil", FAMILY:"Family", LAND:"Land", COMMERCIAL:"Commercial", ANTI_CORRUPTION:"Anti-Corruption" };
  const statusMap: Record<string, string> = { REPORTED:"Reported", UNDER_INVESTIGATION:"Under Investigation", DPP_REVIEW:"DPP Review", FILED_IN_COURT:"Filed in Court", ACTIVE:"Active", ADJOURNED:"Adjourned", COMMITTED_FOR_TRIAL:"Committed for Trial", ON_TRIAL:"On Trial", PENDING_JUDGMENT:"Pending Judgment", JUDGMENT_DELIVERED:"Judgment Delivered", CLOSED:"Closed", DISMISSED:"Dismissed", WITHDRAWN:"Withdrawn", TRANSFERRED:"Transferred", ON_APPEAL:"On Appeal" };

  return apiSuccess({
    total,
    byType: byType.map((i: { caseType: string; _count: number }) => ({ type: i.caseType, label: typeMap[i.caseType] || i.caseType, count: i._count })),
    byStatus: byStatus.map((i: { caseStatus: string; _count: number }) => ({ status: i.caseStatus, label: statusMap[i.caseStatus] || i.caseStatus, count: i._count })),
  });
}
