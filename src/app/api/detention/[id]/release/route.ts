import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DETENTION", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  const { releaseReason } = await request.json();
  await prisma.detentionRecord.update({ where: { id }, data: { status: "RELEASED", actualReleaseDate: new Date(), releaseReason } });
  await logAudit(session.userId, "DETENTION_RELEASED", "DETENTION", id, { newValue: { releaseReason } });
  return apiSuccess({ message: "Released" });
}
