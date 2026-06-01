import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  const { id } = await params;
  const ev = await prisma.evidence.findUnique({
    where: { id },
    include: { case: { select: { caseNumber: true, title: true } }, custodyChain: { include: { fromUser: { select: { firstName: true, lastName: true } }, toUser: { select: { firstName: true, lastName: true } } }, orderBy: { transferDate: "asc" } } },
  });
  if (!ev) return apiNotFound();
  return apiSuccess(ev);
}
