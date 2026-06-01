import { apiSuccess } from "@/lib/utils/response";

export function GET() {
  return apiSuccess({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
