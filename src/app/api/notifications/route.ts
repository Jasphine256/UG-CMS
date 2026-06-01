import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const where: Record<string, unknown> = { userId: session.userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { sentAt: "desc" } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);
  return apiPaginated(notifications, total, page, limit);
}

// Allow system to send notifications
export async function POST(request: NextRequest) {
  const { userId, type, title, body, channel, referenceId, referenceType } = await request.json();
  if (!userId || !title) return apiUnauthorized();
  const notif = await prisma.notification.create({ data: { userId, type: type || "SYSTEM", title, body, channel: channel || "IN_APP", referenceId, referenceType } });
  return apiSuccess(notif, 201);
}
