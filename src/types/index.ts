export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  phoneNumber?: string | null;
  nationalId?: string | null;
  barNumber?: string | null;
  badgeNumber?: string | null;
  jobTitle?: string | null;
  status: string;
  isVerified: boolean;
  lastLoginAt?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, "passwordHash">;

export interface SessionUser {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CaseWithRelations {
  id: string;
  caseNumber: string;
  caseType: string;
  caseStatus: string;
  title: string;
  description?: string | null;
  filingDate: string;
  courtId: string;
  assignedJudgeId?: string | null;
  createdById: string;
  isSensitive: boolean;
  caseFee?: number | null;
  createdAt: string;
  updatedAt: string;
  criminalDetails?: unknown;
  civilDetails?: unknown;
  parties?: unknown[];
  assignedJudge?: SafeUser;
  court?: { id: string; name: string; code: string; level: string };
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: string[];
  children?: NavItem[];
}
