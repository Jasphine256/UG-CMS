import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      court: { select: { id: true, name: true, code: true, level: true, location: true } },
      assignedJudge: { select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true } },
      createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      criminalDetails: true,
      civilDetails: true,
      parties: { include: { lawyer: { select: { id: true, firstName: true, lastName: true } } } },
      timelines: { orderBy: { eventDate: "desc" }, take: 20 },
      hearings: { orderBy: { hearingDate: "desc" }, take: 10, include: { court: { select: { name: true } } } },
      _count: { select: { parties: true, hearings: true, documents: true, evidence: true, bailApplications: true, appeals: true } },
    },
  });
  if (!kase) return apiNotFound("Case not found");
  return apiSuccess(kase);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const body = await request.json();
  const { title, description, isSensitive } = body;

  const kase = await prisma.case.update({
    where: { id }, data: { title, description, isSensitive },
  });

  await logAudit(session.userId, "CASE_UPDATED", "CASE", id, { newValue: body });
  return apiSuccess(kase);
}
