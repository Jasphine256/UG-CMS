import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "APPEAL", "APPROVE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const { outcome, reasoning, orderDetails } = await request.json();
  if (!["ALLOWED","DISMISSED","VARY_SENTENCE","REMAND_FOR_RETRIAL","PARTIALLY_ALLOWED","STRUCK_OUT"].includes(outcome)) return apiError("Invalid outcome");
  const decision = await prisma.appealDecision.create({ data: { appealId: id, outcome, reasoning, orderDetails, decisionDate: new Date(), decidedBy: session.userId } });
  await prisma.appeal.update({ where: { id }, data: { status: "DECIDED" } });
  await logAudit(session.userId, "APPEAL_DECIDED", "APPEAL", id, { newValue: { outcome, reasoning } });
  return apiSuccess(decision, 201);
}
