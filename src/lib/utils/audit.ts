import { prisma } from "@/lib/prisma/client";

export async function logAudit(
  userId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  opts?: { oldValue?: unknown; newValue?: unknown; metadata?: unknown },
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource: resource as never,
      resourceId,
      oldValue: opts?.oldValue ? (JSON.parse(JSON.stringify(opts.oldValue))) : undefined,
      newValue: opts?.newValue ? (JSON.parse(JSON.stringify(opts.newValue))) : undefined,
      metadata: opts?.metadata ? (JSON.parse(JSON.stringify(opts.metadata))) : undefined,
    },
  });
}
