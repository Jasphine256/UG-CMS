import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiNotFound } from "@/lib/utils/response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { uploadedBy: { select: { firstName:true, lastName:true } }, tags: true } });
  if (!doc) return apiNotFound();
  return apiSuccess(doc);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DOCUMENT", "DELETE"); } catch { return apiUnauthorized("Forbidden"); }
  const { id } = await params;
  await prisma.document.delete({ where: { id } });
  return apiSuccess({ message: "Document deleted" });
}
