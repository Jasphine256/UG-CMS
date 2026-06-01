import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "ASSIGN"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { judgeId } = await request.json();
  if (!judgeId) return apiError("judgeId is required");

  const kase = await prisma.case.update({
    where: { id }, data: { assignedJudgeId: judgeId },
    include: { assignedJudge: { select: { id: true, firstName: true, lastName: true } } },
  });

  await prisma.caseTimeline.create({
    data: {
      caseId: id, eventType: "JUDGE_ASSIGNED",
      title: "Judge Assigned",
      description: `Case assigned to ${kase.assignedJudge?.firstName} ${kase.assignedJudge?.lastName}`,
      eventDate: new Date(), createdById: session.userId,
    },
  });

  await logAudit(session.userId, "CASE_ASSIGNED", "CASE", id, { newValue: { judgeId } });

  return apiSuccess(kase);
}
