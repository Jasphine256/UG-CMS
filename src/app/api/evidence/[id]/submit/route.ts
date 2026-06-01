import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "EVIDENCE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  await prisma.evidence.update({ where: { id }, data: { status: "SUBMITTED_TO_COURT" } });
  await logAudit(session.userId, "EVIDENCE_SUBMITTED", "EVIDENCE", id);
  return apiSuccess({ message: "Evidence submitted to court" });
}
