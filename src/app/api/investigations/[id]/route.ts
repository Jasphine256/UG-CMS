import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  const { id } = await params;
  const inv = await prisma.investigation.findUnique({
    where: { id },
    include: { policeStation: true, assignedOfficer: { select: { id:true, firstName:true, lastName:true, email:true } }, supervisingOfficer: { select: { id:true, firstName:true, lastName:true } }, case: { select: { id:true, caseNumber:true, title:true } }, evidence: { orderBy: { createdAt: "desc" } } },
  });
  if (!inv) return apiNotFound();
  return apiSuccess(inv);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "INVESTIGATION", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const body = await request.json();
  const inv = await prisma.investigation.update({ where: { id }, data: body });
  await logAudit(session.userId, "INVESTIGATION_UPDATED", "INVESTIGATION", id, { newValue: body });
  return apiSuccess(inv);
}
