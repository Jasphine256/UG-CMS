import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const hearing = await prisma.hearing.findUnique({
    where: { id },
    include: {
      case: { select: { id: true, caseNumber: true, title: true, caseType: true } },
      court: { select: { id: true, name: true } },
      courtSession: { select: { id: true, name: true } },
    },
  });
  if (!hearing) return apiNotFound();
  return apiSuccess(hearing);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { hearingDate, hearingType, notes, courtId, duration } = await request.json();

  const hearing = await prisma.hearing.update({
    where: { id },
    data: {
      hearingDate: hearingDate ? new Date(hearingDate) : undefined,
      hearingType, notes, courtId, duration,
    },
  });

  await logAudit(session.userId, "HEARING_UPDATED", "HEARING", id, { newValue: { hearingDate, hearingType } });
  return apiSuccess(hearing);
}
