-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('CRIMINAL', 'CIVIL', 'FAMILY', 'LAND', 'COMMERCIAL', 'ANTI_CORRUPTION');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('REPORTED', 'UNDER_INVESTIGATION', 'DPP_REVIEW', 'FILED_IN_COURT', 'ACTIVE', 'ADJOURNED', 'COMMITTED_FOR_TRIAL', 'ON_TRIAL', 'PENDING_JUDGMENT', 'JUDGMENT_DELIVERED', 'CLOSED', 'DISMISSED', 'WITHDRAWN', 'TRANSFERRED', 'ON_APPEAL');

-- CreateEnum
CREATE TYPE "CourtLevel" AS ENUM ('SUPREME', 'COURT_OF_APPEAL', 'HIGH_COURT', 'CHIEF_MAGISTRATE', 'MAGISTRATE_GRADE_I', 'MAGISTRATE_GRADE_II', 'LC_III', 'LC_II', 'LC_I');

-- CreateEnum
CREATE TYPE "HighCourtDivision" AS ENUM ('CIVIL', 'CRIMINAL', 'COMMERCIAL', 'FAMILY', 'LAND', 'ANTI_CORRUPTION', 'INTERNATIONAL_CRIMES');

-- CreateEnum
CREATE TYPE "HearingType" AS ENUM ('FIRST_MENTION', 'PLEA_TAKING', 'BAIL_HEARING', 'CASE_MANAGEMENT_CONFERENCE', 'COMMITTAL', 'PRE_TRIAL', 'TRIAL', 'VERDICT', 'SENTENCING', 'JUDGMENT', 'APPEAL_HEARING', 'REVIEW', 'MENTION', 'STATUS_CONFERENCE');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('COMPLAINANT', 'VICTIM', 'ACCUSED', 'DEFENDANT', 'APPLICANT', 'RESPONDENT', 'WITNESS', 'SURETY', 'PROSECUTOR', 'DEFENCE_COUNSEL', 'THIRD_PARTY', 'INTERESTED_PARTY');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'PHYSICAL_EXHIBIT', 'DIGITAL', 'TESTIMONY', 'PHOTOGRAPH', 'VIDEO', 'FORENSIC', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('IN_CUSTODY', 'SUBMITTED_TO_COURT', 'ADMITTED', 'RETURNED', 'DESTROYED', 'LOST');

-- CreateEnum
CREATE TYPE "BailDecision" AS ENUM ('GRANTED', 'DENIED', 'DEFERRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AppealType" AS ENUM ('FIRST_APPEAL', 'SECOND_APPEAL', 'CONSTITUTIONAL');

-- CreateEnum
CREATE TYPE "AppealOutcome" AS ENUM ('ALLOWED', 'DISMISSED', 'VARY_SENTENCE', 'REMAND_FOR_RETRIAL', 'PARTIALLY_ALLOWED', 'STRUCK_OUT');

-- CreateEnum
CREATE TYPE "DetentionStatus" AS ENUM ('REMAND', 'SENTENCED', 'BAILED', 'TRANSFERRED', 'RELEASED', 'ESCAPED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ASSIGN', 'TRANSFER', 'ARCHIVE', 'EXPORT');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CASE', 'USER', 'ROLE', 'COURT', 'HEARING', 'EVIDENCE', 'DOCUMENT', 'BAIL_APPLICATION', 'APPEAL', 'DETENTION', 'INVESTIGATION', 'NOTIFICATION', 'AUDIT_LOG', 'REPORT', 'SETTINGS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "phoneNumber" TEXT,
    "nationalId" TEXT,
    "barNumber" TEXT,
    "badgeNumber" TEXT,
    "jobTitle" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "hierarchy" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "courtId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" "ResourceType" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "conditions" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" "CourtLevel" NOT NULL,
    "division" "HighCourtDivision",
    "location" TEXT NOT NULL,
    "address" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentCourtId" TEXT,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courtId" TEXT,

    CONSTRAINT "police_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "caseType" "CaseType" NOT NULL,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'REPORTED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filingDate" TIMESTAMP(3) NOT NULL,
    "courtId" TEXT NOT NULL,
    "assignedJudgeId" TEXT,
    "createdById" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "caseFee" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criminal_case_details" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "offenceType" TEXT NOT NULL,
    "offenceDescription" TEXT,
    "penalCodeSection" TEXT,
    "arrestDate" TIMESTAMP(3),
    "arrestWarrantNumber" TEXT,
    "chargeSheetNumber" TEXT,
    "isBailable" BOOLEAN,
    "dppReferenceNumber" TEXT,
    "dppSanctionDate" TIMESTAMP(3),
    "committalDate" TIMESTAMP(3),
    "pleaBargainIndicated" BOOLEAN NOT NULL DEFAULT false,
    "pleaBargainDetails" TEXT,
    "previousConvictions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "criminal_case_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_case_details" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "claimAmount" DECIMAL(15,2),
    "causeOfAction" TEXT,
    "noticeOfIntentionDate" TIMESTAMP(3),
    "plaintFiledDate" TIMESTAMP(3),
    "defenceFiledDate" TIMESTAMP(3),
    "replyFiledDate" TIMESTAMP(3),
    "cmcDate" TIMESTAMP(3),
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "natureOfDispute" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_case_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_parties" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "partyType" "PartyType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherNames" TEXT,
    "nationalId" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "representation" TEXT DEFAULT 'SELF',
    "lawyerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_timelines" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_sessions" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'CRIMINAL_SESSION',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "presidingJudgeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hearings" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "courtSessionId" TEXT,
    "courtId" TEXT NOT NULL,
    "hearingType" "HearingType" NOT NULL,
    "hearingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "outcome" TEXT,
    "notes" TEXT,
    "isAdjourned" BOOLEAN NOT NULL DEFAULT false,
    "adjournmentDate" TIMESTAMP(3),
    "adjournmentReason" TEXT,
    "nextHearingDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "policeStationId" TEXT NOT NULL,
    "assignedOfficerId" TEXT NOT NULL,
    "supervisingOfficerId" TEXT,
    "pgiProsecutorId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closureReportRef" TEXT,
    "findings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "investigationId" TEXT,
    "exhibitNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'IN_CUSTODY',
    "location" TEXT,
    "collectedBy" TEXT,
    "collectedDate" TIMESTAMP(3),
    "admittedDate" TIMESTAMP(3),
    "admittedBy" TEXT,
    "returnDate" TIMESTAMP(3),
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "fileHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_chains" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "signatureFrom" TEXT,
    "signatureTo" TEXT,

    CONSTRAINT "evidence_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bail_applications" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "filingDate" TIMESTAMP(3) NOT NULL,
    "hearingDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "decision" "BailDecision",
    "decisionReason" TEXT,
    "bailAmount" DECIMAL(15,2),
    "conditions" TEXT,
    "isCashBail" BOOLEAN NOT NULL DEFAULT false,
    "decidedBy" TEXT,
    "bondSignedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bail_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sureties" (
    "id" TEXT NOT NULL,
    "bailApplicationId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "occupation" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "relationshipToAccused" TEXT,
    "bondAmount" DECIMAL(15,2),
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationNotes" TEXT,
    "verifiedById" TEXT NOT NULL,
    "verifiedDate" TIMESTAMP(3),
    "identificationDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sureties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL,
    "originalCaseId" TEXT NOT NULL,
    "appellantId" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "appealType" "AppealType" NOT NULL,
    "appealNumber" TEXT NOT NULL,
    "filingDate" TIMESTAMP(3) NOT NULL,
    "groundsOfAppeal" TEXT NOT NULL,
    "reliefSought" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FILED',
    "assignedCourtId" TEXT NOT NULL,
    "assignedJudgeId" TEXT,
    "recordOfAppealUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeal_decisions" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "decisionDate" TIMESTAMP(3) NOT NULL,
    "outcome" "AppealOutcome" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "orderDetails" TEXT,
    "decidedBy" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT true,
    "rightToFurtherAppeal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeal_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "appealId" TEXT,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "accessLevel" TEXT NOT NULL DEFAULT 'PARTIES_ONLY',
    "uploadedById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentDocId" TEXT,
    "signatureHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detention_records" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "expectedReleaseDate" TIMESTAMP(3),
    "actualReleaseDate" TIMESTAMP(3),
    "status" "DetentionStatus" NOT NULL DEFAULT 'REMAND',
    "warrantNumber" TEXT,
    "warrantType" TEXT,
    "bailApplicationId" TEXT,
    "courtOrderNumber" TEXT,
    "releaseReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detention_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prison_transfers" (
    "id" TEXT NOT NULL,
    "detentionRecordId" TEXT NOT NULL,
    "fromFacility" TEXT NOT NULL,
    "toFacility" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "authorizedById" TEXT NOT NULL,
    "courtOrderRef" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prison_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" "ResourceType" NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nationalId_key" ON "users"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_courtId_key" ON "user_roles"("userId", "roleId", "courtId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "courts_code_key" ON "courts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "police_stations_code_key" ON "police_stations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE INDEX "cases_caseStatus_idx" ON "cases"("caseStatus");

-- CreateIndex
CREATE INDEX "cases_caseType_idx" ON "cases"("caseType");

-- CreateIndex
CREATE INDEX "cases_courtId_idx" ON "cases"("courtId");

-- CreateIndex
CREATE INDEX "cases_assignedJudgeId_idx" ON "cases"("assignedJudgeId");

-- CreateIndex
CREATE INDEX "cases_filingDate_idx" ON "cases"("filingDate");

-- CreateIndex
CREATE UNIQUE INDEX "criminal_case_details_caseId_key" ON "criminal_case_details"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "civil_case_details_caseId_key" ON "civil_case_details"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "case_parties_caseId_userId_partyType_key" ON "case_parties"("caseId", "userId", "partyType");

-- CreateIndex
CREATE INDEX "case_timelines_caseId_eventDate_idx" ON "case_timelines"("caseId", "eventDate");

-- CreateIndex
CREATE INDEX "court_sessions_courtId_startDate_idx" ON "court_sessions"("courtId", "startDate");

-- CreateIndex
CREATE INDEX "hearings_hearingDate_idx" ON "hearings"("hearingDate");

-- CreateIndex
CREATE INDEX "hearings_courtId_hearingDate_idx" ON "hearings"("courtId", "hearingDate");

-- CreateIndex
CREATE INDEX "hearings_caseId_idx" ON "hearings"("caseId");

-- CreateIndex
CREATE INDEX "investigations_status_idx" ON "investigations"("status");

-- CreateIndex
CREATE INDEX "evidence_caseId_idx" ON "evidence"("caseId");

-- CreateIndex
CREATE INDEX "bail_applications_caseId_idx" ON "bail_applications"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_appealNumber_key" ON "appeals"("appealNumber");

-- CreateIndex
CREATE INDEX "appeals_originalCaseId_idx" ON "appeals"("originalCaseId");

-- CreateIndex
CREATE INDEX "documents_caseId_idx" ON "documents"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "document_tags_documentId_tag_key" ON "document_tags"("documentId", "tag");

-- CreateIndex
CREATE INDEX "detention_records_personId_idx" ON "detention_records"("personId");

-- CreateIndex
CREATE INDEX "detention_records_caseId_idx" ON "detention_records"("caseId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_sentAt_idx" ON "notifications"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_parentCourtId_fkey" FOREIGN KEY ("parentCourtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_stations" ADD CONSTRAINT "police_stations_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assignedJudgeId_fkey" FOREIGN KEY ("assignedJudgeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criminal_case_details" ADD CONSTRAINT "criminal_case_details_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_case_details" ADD CONSTRAINT "civil_case_details_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_timelines" ADD CONSTRAINT "case_timelines_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_timelines" ADD CONSTRAINT "case_timelines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_sessions" ADD CONSTRAINT "court_sessions_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_sessions" ADD CONSTRAINT "court_sessions_presidingJudgeId_fkey" FOREIGN KEY ("presidingJudgeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_courtSessionId_fkey" FOREIGN KEY ("courtSessionId") REFERENCES "court_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_policeStationId_fkey" FOREIGN KEY ("policeStationId") REFERENCES "police_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_supervisingOfficerId_fkey" FOREIGN KEY ("supervisingOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_chains" ADD CONSTRAINT "evidence_chains_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_chains" ADD CONSTRAINT "evidence_chains_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_chains" ADD CONSTRAINT "evidence_chains_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bail_applications" ADD CONSTRAINT "bail_applications_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bail_applications" ADD CONSTRAINT "bail_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sureties" ADD CONSTRAINT "sureties_bailApplicationId_fkey" FOREIGN KEY ("bailApplicationId") REFERENCES "bail_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sureties" ADD CONSTRAINT "sureties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sureties" ADD CONSTRAINT "sureties_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_originalCaseId_fkey" FOREIGN KEY ("originalCaseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_assignedCourtId_fkey" FOREIGN KEY ("assignedCourtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal_decisions" ADD CONSTRAINT "appeal_decisions_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detention_records" ADD CONSTRAINT "detention_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prison_transfers" ADD CONSTRAINT "prison_transfers_detentionRecordId_fkey" FOREIGN KEY ("detentionRecordId") REFERENCES "detention_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

