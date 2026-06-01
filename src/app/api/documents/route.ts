import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiPaginated, apiError } from "@/lib/utils/response";
import { getPagination } from "@/lib/utils/pagination";
import { logAudit } from "@/lib/utils/audit";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DOCUMENT", "READ"); } catch { return apiUnauthorized("Forbidden"); }
  const { page, limit, skip } = getPagination(request.nextUrl.searchParams);
  const caseId = request.nextUrl.searchParams.get("caseId") || undefined;
  const where: Record<string, unknown> = {};
  if (caseId) where.caseId = caseId;
  const [docs, total] = await Promise.all([
    prisma.document.findMany({ where, include: { uploadedBy: { select: { id:true, firstName:true, lastName:true } }, tags: true }, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.document.count({ where }),
  ]);
  return apiPaginated(docs, total, page, limit);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "DOCUMENT", "CREATE"); } catch { return apiUnauthorized("Forbidden"); }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const caseId = formData.get("caseId") as string | null;
  const title = formData.get("title") as string || file?.name || "Untitled";
  const documentType = formData.get("documentType") as string || "OTHER";
  const tags = (formData.get("tags") as string || "").split(",").filter(Boolean);

  if (!file) return apiError("File is required");

  await mkdir(UPLOADS_DIR, { recursive: true });
  const fileName = `${randomUUID()}-${file.name}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const doc = await prisma.document.create({
    data: {
      caseId: caseId || null, title, documentType,
      fileName: file.name, fileUrl: `/uploads/${fileName}`,
      fileSize: buffer.length, mimeType: file.type || "application/octet-stream",
      uploadedById: session.userId,
      tags: tags.length > 0 ? { create: tags.map(t => ({ tag: t.trim() })) } : undefined,
    },
    include: { tags: true },
  });

  await logAudit(session.userId, "DOCUMENT_UPLOADED", "DOCUMENT", doc.id, { newValue: { title, fileName: file.name } });
  return apiSuccess(doc, 201);
}
