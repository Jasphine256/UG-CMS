import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "HEARING", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: courtSessionId } = await params;
  const { caseId, hearingType, hearingDate, courtId, notes } = await request.json();

  const hearing = await prisma.hearing.create({
    data: {
      caseId, courtSessionId, hearingType, courtId,
      hearingDate: new Date(hearingDate), notes, createdById: session.userId,
    },
  });

  return apiSuccess(hearing, 201);
}
