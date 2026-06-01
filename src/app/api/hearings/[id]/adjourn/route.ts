import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { nextHearingDate, reason } = await request.json();
  if (!nextHearingDate) return apiError("nextHearingDate is required");

  const hearing = await prisma.hearing.update({
    where: { id },
    data: {
      isAdjourned: true, adjournmentDate: new Date(), adjournmentReason: reason, nextHearingDate: new Date(nextHearingDate),
    },
  });

  // Create timeline event on parent case
  await prisma.caseTimeline.create({
    data: {
      caseId: hearing.caseId, eventType: "HEARING_ADJOURNED", title: "Hearing Adjourned",
      description: reason || "Adjourned to next date", eventDate: new Date(), createdById: session.userId,
      metadata: { nextHearingDate, hearingId: id },
    },
  });

  // Update case status to ADJOURNED
  await prisma.case.update({ where: { id: hearing.caseId }, data: { caseStatus: "ADJOURNED" } });

  await logAudit(session.userId, "HEARING_ADJOURNED", "HEARING", id, { newValue: { nextHearingDate, reason } });
  return apiSuccess(hearing);
}
