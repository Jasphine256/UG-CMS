import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated, apiError } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "EVIDENCE", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const caseId = request.nextUrl.searchParams.get("caseId") || undefined;
  const where: Record<string, unknown> = {};
  if (caseId) where.caseId = caseId;
  const [items, total] = await Promise.all([
    prisma.evidence.findMany({ where, include: { case: { select: { caseNumber: true, title: true } } }, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.evidence.count({ where }),
  ]);
  return apiPaginated(items, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "EVIDENCE", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { caseId, investigationId, description, evidenceType, exhibitNumber, location, collectedBy } = await request.json();
  if (!caseId || !description) return apiError("caseId and description required");

  const ev = await prisma.evidence.create({
    data: { caseId, investigationId: investigationId || null, description, evidenceType: evidenceType || "PHYSICAL_EXHIBIT", exhibitNumber: exhibitNumber || "PE-001", location, collectedBy, status: "IN_CUSTODY" },
  });
  // Chain of custody - first entry
  await prisma.evidenceChain.create({ data: { evidenceId: ev.id, fromUserId: session.userId, toUserId: session.userId, purpose: "COLLECTION", notes: "Evidence collected and logged" } });
  await logAudit(session.userId, "EVIDENCE_REGISTERED", "EVIDENCE", ev.id, { newValue: { caseId, description } });
  return apiSuccess(ev, 201);
}
