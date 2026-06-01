import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DETENTION", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const { toFacility, reason, courtOrderRef } = await request.json();
  await prisma.detentionRecord.update({ where: { id }, data: { status: "TRANSFERRED" } });
  await prisma.prisonTransfer.create({ data: { detentionRecordId: id, fromFacility: (await prisma.detentionRecord.findUnique({where:{id}}))?.facilityName||"Unknown", toFacility, reason, authorizedById: session.userId, courtOrderRef, transferDate: new Date() } });
  await logAudit(session.userId, "DETENTION_TRANSFERRED", "DETENTION", id, { newValue: { toFacility, reason } });
  return apiSuccess({ message: "Transferred" });
}
