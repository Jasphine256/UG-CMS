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
  const { id: evidenceId } = await params;
  const { toUserId, purpose, notes, signatureFrom, signatureTo } = await request.json();
  const chain = await prisma.evidenceChain.create({ data: { evidenceId, fromUserId: session.userId, toUserId, purpose, notes, signatureFrom, signatureTo } });
  await logAudit(session.userId, "EVIDENCE_TRANSFERRED", "EVIDENCE", evidenceId, { newValue: { purpose, toUserId } });
  return apiSuccess(chain, 201);
}
