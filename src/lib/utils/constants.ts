export const SITE_NAME = "UG-CMS";
export const SITE_DESCRIPTION = "Uganda Government Digital Case Management System";

export const CASE_TYPE_LABELS: Record<string, string> = {
  CRIMINAL: "Criminal",
  CIVIL: "Civil",
  FAMILY: "Family",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  ANTI_CORRUPTION: "Anti-Corruption",
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reported",
  UNDER_INVESTIGATION: "Under Investigation",
  DPP_REVIEW: "DPP Review",
  FILED_IN_COURT: "Filed in Court",
  ACTIVE: "Active",
  ADJOURNED: "Adjourned",
  COMMITTED_FOR_TRIAL: "Committed for Trial",
  ON_TRIAL: "On Trial",
  PENDING_JUDGMENT: "Pending Judgment",
  JUDGMENT_DELIVERED: "Judgment Delivered",
  CLOSED: "Closed",
  DISMISSED: "Dismissed",
  WITHDRAWN: "Withdrawn",
  TRANSFERRED: "Transferred",
  ON_APPEAL: "On Appeal",
};

export const COURT_LEVEL_LABELS: Record<string, string> = {
  SUPREME: "Supreme Court",
  COURT_OF_APPEAL: "Court of Appeal",
  HIGH_COURT: "High Court",
  CHIEF_MAGISTRATE: "Chief Magistrate",
  MAGISTRATE_GRADE_I: "Magistrate Grade I",
  MAGISTRATE_GRADE_II: "Magistrate Grade II",
  LC_III: "LC III Court",
  LC_II: "LC II Court",
  LC_I: "LC I Court",
};

export const HEARING_TYPE_LABELS: Record<string, string> = {
  FIRST_MENTION: "First Mention",
  PLEA_TAKING: "Plea Taking",
  BAIL_HEARING: "Bail Hearing",
  CASE_MANAGEMENT_CONFERENCE: "Case Management Conference",
  COMMITTAL: "Committal",
  PRE_TRIAL: "Pre-Trial",
  TRIAL: "Trial",
  VERDICT: "Verdict",
  SENTENCING: "Sentencing",
  JUDGMENT: "Judgment",
  APPEAL_HEARING: "Appeal Hearing",
  REVIEW: "Review",
  MENTION: "Mention",
  STATUS_CONFERENCE: "Status Conference",
};

export const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  DOCUMENT: "Document",
  PHYSICAL_EXHIBIT: "Physical Exhibit",
  DIGITAL: "Digital",
  TESTIMONY: "Testimony",
  PHOTOGRAPH: "Photograph",
  VIDEO: "Video",
  FORENSIC: "Forensic",
  OTHER: "Other",
};

export const PAGINATION_DEFAULT_SIZE = 20;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
