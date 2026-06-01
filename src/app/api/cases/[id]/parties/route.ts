import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const parties = await prisma.caseParty.findMany({
    where: { caseId: id },
    include: { lawyer: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { partyType: "asc" },
  });
  return apiSuccess(parties);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id: caseId } = await params;
  const body = await request.json();

  const party = await prisma.caseParty.create({ data: { caseId, ...body } });

  await prisma.caseTimeline.create({
    data: {
      caseId, eventType: "PARTY_ADDED",
      title: "Party Added", description: `${party.firstName} ${party.lastName} added as ${body.partyType}`,
      eventDate: new Date(), createdById: session.userId,
    },
  });

  await logAudit(session.userId, "CASE_PARTY_ADDED", "CASE", caseId, { newValue: body });
  return apiSuccess(party, 201);
}
