import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { caseId, hearingType, hearingDate, courtId, courtSessionId, notes } = await request.json();

  const hearing = await prisma.hearing.create({
    data: {
      caseId, hearingType, hearingDate: new Date(hearingDate), courtId,
      courtSessionId: courtSessionId || null, notes, createdById: session.userId,
    },
  });

  // Add timeline
  await prisma.caseTimeline.create({
    data: {
      caseId, eventType: "HEARING_SCHEDULED", title: "Hearing Scheduled",
      description: `${hearingType.replace(/_/g, " ")} scheduled for ${new Date(hearingDate).toLocaleDateString()}`,
      eventDate: new Date(), createdById: session.userId,
      metadata: { hearingId: hearing.id, hearingType, hearingDate },
    },
  });

  await logAudit(session.userId, "HEARING_CREATED", "HEARING", hearing.id, { newValue: { caseId, hearingType, hearingDate } });
  return apiSuccess(hearing, 201);
}
