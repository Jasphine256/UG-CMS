import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "COURT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const cs = await prisma.courtSession.findUnique({
    where: { id },
    include: {
      court: { select: { id: true, name: true, code: true } },
      presidingJudge: { select: { id: true, firstName: true, lastName: true } },
      hearings: { include: { case: { select: { id: true, caseNumber: true, title: true } } }, orderBy: { hearingDate: "asc" } },
    },
  });
  if (!cs) return apiNotFound("Session not found");
  return apiSuccess(cs);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "COURT", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { name, status, startDate, endDate, notes } = await request.json();

  const cs = await prisma.courtSession.update({
    where: { id },
    data: { name, status, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, notes },
  });
  return apiSuccess(cs);
}
