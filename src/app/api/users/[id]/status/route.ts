import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  if (id === session.userId) return apiError("Cannot change your own status");

  const body = await request.json();
  const { status } = body;
  if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) return apiError("Invalid status");

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: { id: true, email: true, status: true },
  });

  await logAudit(session.userId, "USER_STATUS_CHANGED", "USER", id, { newValue: { status } });

  return apiSuccess(user);
}
