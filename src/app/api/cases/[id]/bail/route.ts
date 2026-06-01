import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const bail = await prisma.bailApplication.findMany({
    where: { caseId: id },
    include: { sureties: true },
    orderBy: { filingDate: "desc" },
  });
  return apiSuccess(bail);
}
