import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { hashPassword } from "@/lib/auth/auth";
import { registerSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/utils/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || "Validation failed");
    }

    const { email, password, firstName, lastName, phoneNumber, nationalId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return apiError("Email already registered");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        firstName,
        lastName,
        phoneNumber,
        nationalId,
        status: "ACTIVE",
        isVerified: false,
      },
    });

    // Assign default "complainant" role
    const complainantRole = await prisma.role.findUnique({ where: { slug: "complainant" } });
    if (complainantRole) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: complainantRole.id } });
    }

    return apiSuccess(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      201,
    );
  } catch (error) {
    console.error("Registration error:", error);
    return apiError("Internal server error", 500);
  }
}
