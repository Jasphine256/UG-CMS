import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; partyId: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: caseId, partyId } = await params;
  const body = await request.json();
  const party = await prisma.caseParty.update({ where: { id: partyId }, data: body });

  await logAudit(session.userId, "CASE_PARTY_UPDATED", "CASE", caseId, { newValue: body });
  return apiSuccess(party);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; partyId: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: caseId, partyId } = await params;
  await prisma.caseParty.delete({ where: { id: partyId } });
  await logAudit(session.userId, "CASE_PARTY_REMOVED", "CASE", caseId);
  return apiSuccess({ message: "Party removed" });
}
