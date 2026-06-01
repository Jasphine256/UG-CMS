import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET() {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "REPORT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const judges = await prisma.user.findMany({
    where: { assignedCases: { some: {} } },
    select: { id:true, firstName:true, lastName:true,
      _count: { select: { assignedCases: true } },
      assignedCases: { select: { caseStatus: true } },
    },
  });

  const data = judges.map((j: {
    id: string; firstName: string; lastName: string;
    _count: { assignedCases: number };
    assignedCases: { caseStatus: string }[];
  }) => {
    const closed = j.assignedCases.filter(c => ["CLOSED","DISMISSED","JUDGMENT_DELIVERED"].includes(c.caseStatus)).length;
    return { id:j.id, name:`${j.firstName} ${j.lastName}`, totalCases:j._count.assignedCases, closed, pending: j._count.assignedCases-closed, dispositionRate: j._count.assignedCases>0 ? Math.round((closed/j._count.assignedCases)*100) : 0 };
  });

  return apiSuccess(data);
}
