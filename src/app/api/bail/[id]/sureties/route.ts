import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "BAIL_APPLICATION", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id: bailAppId } = await params;
  const { fullName, nationalId, occupation, address, phoneNumber, relationshipToAccused, bondAmount } = await request.json();
  if (!fullName || !nationalId) return apiError("fullName and nationalId required");
  const surety = await prisma.surety.create({ data: { bailApplicationId: bailAppId, fullName, nationalId, occupation, address, phoneNumber, relationshipToAccused, bondAmount, verifiedById: session.userId } });
  return apiSuccess(surety, 201);
}
