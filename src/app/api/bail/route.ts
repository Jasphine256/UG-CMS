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
  try { await requirePermission(session.userId, "BAIL_APPLICATION", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const caseId = request.nextUrl.searchParams.get("caseId") || undefined;
  const where: Record<string, unknown> = {};
  if (caseId) where.caseId = caseId;
  const [items, total] = await Promise.all([
    prisma.bailApplication.findMany({ where, include: { case: { select: { caseNumber: true, title: true } }, applicant: { select: { id:true, firstName:true, lastName:true } }, sureties: true }, skip, take: limit, orderBy: { filingDate: "desc" } }),
    prisma.bailApplication.count({ where }),
  ]);
  return apiPaginated(items, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "BAIL_APPLICATION", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }
  const body = await request.json();
  if (!body.caseId || !body.applicantId) return apiError("caseId and applicantId required");
  const bail = await prisma.bailApplication.create({ data: { caseId: body.caseId, applicantId: body.applicantId, filingDate: new Date(), bailAmount: body.bailAmount, isCashBail: body.isCashBail || false, conditions: body.conditions } });
  await prisma.caseTimeline.create({ data: { caseId: body.caseId, eventType: "BAIL_FILED", title: "Bail Application Filed", description: "Bail application submitted", eventDate: new Date(), createdById: session.userId } });
  await logAudit(session.userId, "BAIL_FILED", "BAIL_APPLICATION", bail.id, { newValue: body });
  return apiSuccess(bail, 201);
}
