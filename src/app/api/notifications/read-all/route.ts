import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  await prisma.notification.updateMany({ where: { userId: session.userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
  return apiSuccess({ message: "All marked as read" });
}
