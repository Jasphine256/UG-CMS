import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const timeline = await prisma.caseTimeline.findMany({
    where: { caseId: id },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { eventDate: "desc" },
  });
  return apiSuccess(timeline);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: caseId } = await params;
  const { eventType, title, description, eventDate } = await request.json();

  const event = await prisma.caseTimeline.create({
    data: {
      caseId, eventType: eventType || "MANUAL_ENTRY",
      title, description,
      eventDate: eventDate ? new Date(eventDate) : new Date(),
      createdById: session.userId,
    },
  });

  return apiSuccess(event, 201);
}
