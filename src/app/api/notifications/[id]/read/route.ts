import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  const { id } = await params;
  await prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  return apiSuccess({ message: "Marked as read" });
}
