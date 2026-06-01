import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/auth";
import { apiSuccess, apiError, apiUnauthorized, apiPaginated } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";
import { registerSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "READ"); } catch { return apiUnauthorized("Forbidden"); }

  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams.get("q") || "";

  const where = search ? {
    OR: [
      { email: { contains: search, mode: "insensitive" as const } },
      { firstName: { contains: search, mode: "insensitive" as const } },
      { lastName: { contains: search, mode: "insensitive" as const } },
    ],
  } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true, phoneNumber: true,
        jobTitle: true, status: true, lastLoginAt: true, createdAt: true,
        roles: { include: { role: { select: { id: true, name: true, slug: true } }, court: { select: { id: true, name: true } } } },
      },
      skip, take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return apiPaginated(users, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "USER", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message || "Validation failed");

  const { email, password, firstName, lastName, phoneNumber, nationalId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return apiError("Email already registered");

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), firstName, lastName, phoneNumber, nationalId },
  });

  await logAudit(session.userId, "USER_CREATED", "USER", user.id, { newValue: { email, firstName, lastName } });

  return apiSuccess({ id: user.id, email: user.email }, 201);
}
