import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "INVESTIGATION", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const [investigations, total] = await Promise.all([
    prisma.investigation.findMany({ where, include: { policeStation: { select: { name: true } }, assignedOfficer: { select: { id:true, firstName:true, lastName:true } }, supervisingOfficer: { select: { id:true, firstName:true, lastName:true } }, _count: { select: { evidence: true } } }, skip, take: limit, orderBy: { startDate: "desc" } }),
    prisma.investigation.count({ where }),
  ]);
  return apiPaginated(investigations, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "INVESTIGATION", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }
  const body = await request.json();
  const inv = await prisma.investigation.create({
    data: {
      caseId: body.caseId || null, policeStationId: body.policeStationId,
      assignedOfficerId: body.assignedOfficerId, supervisingOfficerId: body.supervisingOfficerId || null,
      pgiProsecutorId: body.pgiProsecutorId || null,
      startDate: new Date(body.startDate || new Date()), status: "ACTIVE",
    },
  });
  await logAudit(session.userId, "INVESTIGATION_CREATED", "INVESTIGATION", inv.id, { newValue: body });
  return apiSuccess(inv, 201);
}
