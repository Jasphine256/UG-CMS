import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission, getUserRoles } from "@/lib/auth/rbac";
import { apiSuccess, apiError, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";
import { generateCaseNumber } from "@/lib/utils/case-number";
import { z } from "zod";
import { format } from "date-fns";

const createCaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  caseType: z.enum(["CRIMINAL", "CIVIL", "FAMILY", "LAND", "COMMERCIAL", "ANTI_CORRUPTION"]),
  courtId: z.string().min(1),
  isSensitive: z.boolean().optional(),
  caseFee: z.number().optional(),
  // Criminal-specific
  offenceType: z.string().optional(),
  offenceDescription: z.string().optional(),
  penalCodeSection: z.string().optional(),
  arrestDate: z.string().optional(),
  isBailable: z.boolean().optional(),
  // Civil-specific
  claimAmount: z.number().optional(),
  causeOfAction: z.string().optional(),
  natureOfDispute: z.string().optional(),
  // Parties
  parties: z.array(z.object({
    partyType: z.string(), firstName: z.string(), lastName: z.string(),
    nationalId: z.string().optional(), phoneNumber: z.string().optional(),
    email: z.string().optional(), address: z.string().optional(),
    isMinor: z.boolean().optional(), representation: z.string().optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const sp = request.nextUrl.searchParams;
  const search = sp.get("q") || "";
  const caseType = sp.get("type") || undefined;
  const caseStatus = sp.get("status") || undefined;
  const courtId = sp.get("courtId") || undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" as const } },
      { title: { contains: search, mode: "insensitive" as const } },
    ];
  }
  if (caseType) where.caseType = caseType;
  if (caseStatus) where.caseStatus = caseStatus;
  if (courtId) where.courtId = courtId;

  // Data-level access: non-admin users only see cases from their courts
  if (!session.roles.includes("system_administrator")) {
    const userRoles = await getUserRoles(session.userId);
    const courtIds = userRoles.filter(ur => ur.courtId).map(ur => ur.courtId!);
    if (courtIds.length > 0) where.courtId = { in: courtIds };
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        court: { select: { id: true, name: true, code: true, level: true } },
        assignedJudge: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { parties: true, hearings: true, documents: true } },
      },
      skip, take: limit,
      orderBy: { filingDate: "desc" },
    }),
    prisma.case.count({ where }),
  ]);

  return apiPaginated(cases, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const body = await request.json();
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map(i => i.message).join(", "));

  const d = parsed.data;
  const court = await prisma.court.findUnique({ where: { id: d.courtId } });
  if (!court) return apiError("Invalid court");

  // Generate case number
  const year = format(new Date(), "yyyy");
  const lastCase = await prisma.case.findFirst({
    where: { courtId: d.courtId, filingDate: { gte: new Date(`${year}-01-01`) } },
    orderBy: { caseNumber: "desc" }, select: { caseNumber: true },
  });
  let seq = 1;
  if (lastCase) {
    const parts = lastCase.caseNumber.split("-");
    const seqStr = parts[parts.length - 1]?.split("/")[0];
    seq = (parseInt(seqStr || "0", 10) || 0) + 1;
  }
  const caseNumber = generateCaseNumber(court.code, d.caseType, new Date(), seq);

  const caseData: Record<string, unknown> = {
    caseNumber, title: d.title, description: d.description || null,
    caseType: d.caseType, caseStatus: "FILED_IN_COURT",
    filingDate: new Date(), courtId: d.courtId, createdById: session.userId,
    isSensitive: d.isSensitive || false, caseFee: d.caseFee || null,
  };

  const kase = await prisma.case.create({ data: caseData as never });

  // Create criminal/civil details
  if (d.caseType === "CRIMINAL" && d.offenceType) {
    await prisma.criminalCaseDetails.create({
      data: {
        caseId: kase.id, offenceType: d.offenceType,
        offenceDescription: d.offenceDescription || null,
        penalCodeSection: d.penalCodeSection || null,
        arrestDate: d.arrestDate ? new Date(d.arrestDate) : null,
        isBailable: d.isBailable,
      },
    });
  }
  if (d.caseType === "CIVIL" && d.causeOfAction) {
    await prisma.civilCaseDetails.create({
      data: {
        caseId: kase.id, claimAmount: d.claimAmount || null,
        causeOfAction: d.causeOfAction, natureOfDispute: d.natureOfDispute || null,
      },
    });
  }

  // Create parties
  if (d.parties) {
    for (const p of d.parties) {
      await prisma.caseParty.create({
        data: { caseId: kase.id, ...p } as never,
      });
    }
  }

  // Initial timeline event
  await prisma.caseTimeline.create({
    data: {
      caseId: kase.id, eventType: "CASE_FILED",
      title: "Case Filed", description: `Case registered as ${caseNumber}`,
      eventDate: new Date(), createdById: session.userId,
    },
  });

  await logAudit(session.userId, "CASE_CREATED", "CASE", kase.id, { newValue: { caseNumber, title: d.title } });

  return apiSuccess(kase, 201);
}
