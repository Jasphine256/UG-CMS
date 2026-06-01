import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated, apiError } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "APPEAL", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const [items, total] = await Promise.all([
    prisma.appeal.findMany({ include: { originalCase: { select: { caseNumber:true, title:true } }, assignedCourt: { select: { name:true } }, decisions: true }, skip, take: limit, orderBy: { filingDate: "desc" } }),
    prisma.appeal.count(),
  ]);
  return apiPaginated(items, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "APPEAL", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }
  const body = await request.json();
  if (!body.originalCaseId || !body.assignedCourtId) return apiError("originalCaseId and assignedCourtId required");

  const year = format(new Date(), "yyyy");
  const last = await prisma.appeal.findFirst({ where: { assignedCourtId: body.assignedCourtId, filingDate: { gte: new Date(`${year}-01-01`) } }, orderBy: { appealNumber: "desc" }, select: { appealNumber: true } });
  let seq = 1;
  if (last) { const p = last.appealNumber.split("-"); const s = p[p.length-1]?.split("/")[0]; seq = (parseInt(s||"0")||0)+1; }
  const appealNumber = `${((await prisma.court.findUnique({where:{id:body.assignedCourtId}}))?.code||"CA")}-CA-${String(seq).padStart(3,"0")}/${year}`;

  const appeal = await prisma.appeal.create({ data: { originalCaseId: body.originalCaseId, appellantId: body.appellantId, respondentId: body.respondentId, appealType: body.appealType||"FIRST_APPEAL", appealNumber, groundsOfAppeal: body.groundsOfAppeal, reliefSought: body.reliefSought, assignedCourtId: body.assignedCourtId, filingDate: new Date() } });
  await prisma.case.update({ where: { id: body.originalCaseId }, data: { caseStatus: "ON_APPEAL" } });
  await prisma.caseTimeline.create({ data: { caseId: body.originalCaseId, eventType: "APPEAL_FILED", title: "Appeal Filed", description: `Appeal ${appealNumber} filed`, eventDate: new Date(), createdById: session.userId } });
  await logAudit(session.userId, "APPEAL_FILED", "APPEAL", appeal.id, { newValue: body });
  return apiSuccess(appeal, 201);
}
