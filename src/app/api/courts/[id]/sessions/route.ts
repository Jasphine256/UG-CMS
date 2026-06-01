import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "COURT", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const sessions = await prisma.courtSession.findMany({
    where: { courtId: id },
    include: {
      presidingJudge: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { hearings: true } },
    },
    orderBy: { startDate: "desc" },
  });
  return apiSuccess(sessions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "COURT", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: courtId } = await params;
  const { name, startDate, endDate, sessionType, presidingJudgeId, notes } = await request.json();

  const cs = await prisma.courtSession.create({
    data: { courtId, name, startDate: new Date(startDate), endDate: new Date(endDate), sessionType, presidingJudgeId, notes },
  });

  return apiSuccess(cs, 201);
}
