import type { User, Case, Court, Role } from "@prisma/client";

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

export interface CaseWithRelations extends Case {
  criminalDetails?: unknown;
  civilDetails?: unknown;
  parties?: unknown[];
  assignedJudge?: SafeUser;
  court?: Court;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: string[];
  children?: NavItem[];
}

export type { PermissionAction, ResourceType, CaseType, CaseStatus, CourtLevel, HearingType, PartyType } from "@prisma/client";
