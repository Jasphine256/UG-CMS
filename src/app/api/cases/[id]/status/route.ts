import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/rbac";
import { apiSuccess, apiUnauthorized, apiError } from "@/lib/utils/response";
import { logAudit } from "@/lib/utils/audit";

const VALID_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ["UNDER_INVESTIGATION", "WITHDRAWN"],
  UNDER_INVESTIGATION: ["DPP_REVIEW", "CLOSED"],
  DPP_REVIEW: ["FILED_IN_COURT", "CLOSED"],
  FILED_IN_COURT: ["ACTIVE", "DISMISSED", "WITHDRAWN", "TRANSFERRED"],
  ACTIVE: ["ADJOURNED", "COMMITTED_FOR_TRIAL", "ON_TRIAL", "CLOSED"],
  ADJOURNED: ["ACTIVE", "DISMISSED"],
  COMMITTED_FOR_TRIAL: ["ON_TRIAL"],
  ON_TRIAL: ["PENDING_JUDGMENT", "ADJOURNED"],
  PENDING_JUDGMENT: ["JUDGMENT_DELIVERED"],
  JUDGMENT_DELIVERED: ["CLOSED", "ON_APPEAL"],
  CLOSED: [],
  DISMISSED: [],
  WITHDRAWN: [],
  TRANSFERRED: ["FILED_IN_COURT"],
  ON_APPEAL: ["CLOSED"],
};

const STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reported", UNDER_INVESTIGATION: "Under Investigation", DPP_REVIEW: "DPP Review",
  FILED_IN_COURT: "Filed in Court", ACTIVE: "Active", ADJOURNED: "Adjourned",
  COMMITTED_FOR_TRIAL: "Committed for Trial", ON_TRIAL: "On Trial",
  PENDING_JUDGMENT: "Pending Judgment", JUDGMENT_DELIVERED: "Judgment Delivered",
  CLOSED: "Closed", DISMISSED: "Dismissed", WITHDRAWN: "Withdrawn",
  TRANSFERRED: "Transferred", ON_APPEAL: "On Appeal",
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return apiUnauthorized();
  try { await requirePermission(session.userId, "CASE", "UPDATE"); } catch { return apiUnauthorized("Forbidden"); }

  const { id } = await params;
  const { status, notes } = await request.json();

  const kase = await prisma.case.findUnique({ where: { id } });
  if (!kase) return apiError("Case not found");

  const allowed = VALID_TRANSITIONS[kase.caseStatus] || [];
  if (!allowed.includes(status)) {
    return apiError(`Cannot transition from ${kase.caseStatus} to ${status}. Allowed: ${allowed.join(", ")}`);
  }

  const updated = await prisma.case.update({
    where: { id }, data: { caseStatus: status },
  });

  // Auto-create timeline event
  await prisma.caseTimeline.create({
    data: {
      caseId: id, eventType: `STATUS_${status}`,
      title: `Status: ${STATUS_LABELS[status] || status}`,
      description: notes || null,
      eventDate: new Date(), createdById: session.userId,
      metadata: { from: kase.caseStatus, to: status },
    },
  });

  await logAudit(session.userId, "CASE_STATUS_CHANGED", "CASE", id, { oldValue: { status: kase.caseStatus }, newValue: { status } });

  return apiSuccess(updated);
}
