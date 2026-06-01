import { prisma } from "@/lib/prisma/client";
import type { ResourceType, PermissionAction } from "@prisma/client";

export async function logAudit(
  userId: string | null,
  action: string,
  resource: ResourceType,
  resourceId: string | null,
  opts?: { oldValue?: unknown; newValue?: unknown; metadata?: unknown },
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      oldValue: opts?.oldValue ? (JSON.parse(JSON.stringify(opts.oldValue))) : undefined,
      newValue: opts?.newValue ? (JSON.parse(JSON.stringify(opts.newValue))) : undefined,
      metadata: opts?.metadata ? (JSON.parse(JSON.stringify(opts.metadata))) : undefined,
    },
  });
}
