import { NextRequest } from "next/server";
import { apiSuccess, apiUnauthorized } from "@/lib/utils/response";
import { clearSessionCookies, getSession } from "@/lib/auth/session";

export async function POST(_request: NextRequest) {
  const session = await getSession();
  const response = apiSuccess({ message: "Logged out" });
  for (const cookie of clearSessionCookies()) {
    response.cookies.set(cookie);
  }
  return response;
}
