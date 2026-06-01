import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { outcome, notes } = await request.json();

  const hearing = await prisma.hearing.update({
    where: { id }, data: { outcome, notes, endTime: new Date() },
  });

  await prisma.caseTimeline.create({
    data: {
      caseId: hearing.caseId, eventType: "HEARING_OUTCOME", title: "Hearing Outcome Recorded",
      description: outcome, eventDate: new Date(), createdById: session.userId,
    },
  });

  await logAudit(session.userId, "HEARING_OUTCOME", "HEARING", id, { newValue: { outcome } });
  return apiSuccess(hearing);
}
