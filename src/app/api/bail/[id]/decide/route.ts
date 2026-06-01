import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "BAIL_APPLICATION", "APPROVE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const { decision, decisionReason } = await request.json();
  if (!["GRANTED","DENIED","REVOKED"].includes(decision)) return apiError("Invalid decision");
  const bail = await prisma.bailApplication.update({ where: { id }, data: { decision, decisionReason, decisionDate: new Date(), decidedBy: session.userId } });
  await prisma.caseTimeline.create({ data: { caseId: bail.caseId, eventType: `BAIL_${decision}`, title: `Bail ${decision.toLowerCase()}`, description: decisionReason || null, eventDate: new Date(), createdById: session.userId } });
  await logAudit(session.userId, "BAIL_DECIDED", "BAIL_APPLICATION", id, { newValue: { decision, decisionReason } });
  return apiSuccess(bail);
}
