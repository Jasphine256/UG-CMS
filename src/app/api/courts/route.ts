import { prisma } from "@/lib/prisma/client";
import { apiSuccess } from "@/lib/utils/response";

export async function GET() {
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, level: true, location: true, parentCourtId: true },
    orderBy: { level: "asc" },
  });
  return apiSuccess(courts);
}
