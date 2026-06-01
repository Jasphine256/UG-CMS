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
  try { await requirePermission(session.userId, "DETENTION", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.detentionRecord.findMany({ where, include: { case: { select: { caseNumber:true, title:true } } }, skip, take: limit, orderBy: { admissionDate: "desc" } }),
    prisma.detentionRecord.count({ where }),
  ]);
  return apiPaginated(items, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DETENTION", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }
  const body = await request.json();
  if (!body.personId || !body.caseId || !body.facilityName) return apiError("personId, caseId, facilityName required");
  const det = await prisma.detentionRecord.create({ data: { personId: body.personId, caseId: body.caseId, facilityName: body.facilityName, admissionDate: new Date(body.admissionDate||new Date()), warrantNumber: body.warrantNumber, warrantType: body.warrantType, status: "REMAND" } });
  await logAudit(session.userId, "DETENTION_CREATED", "DETENTION", det.id, { newValue: body });
  return apiSuccess(det, 201);
}
