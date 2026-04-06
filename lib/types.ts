export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string;
  company: string;
  linkedinUrl: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  // User-provided context from CSV
  notes: string | null;
  // AI enrichment
  researchContext: string | null;
  sourceUrl: string | null; // URL of the specific thing referenced in the hook
  personalizedHook: string | null;
  personalizedSubject: string | null; // Subject line tied to the hook
  enrichmentStatus: "pending" | "enriching" | "done" | "failed";
  // Outreach
  channel: "email" | "linkedin";
  status: "pending" | "done" | "skipped";
  replied: boolean;
  // Batching
  batchDay: number; // 0-4 (Mon-Fri)
  batchIndex: number; // position within the day's batch
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  weekStartDate: string; // ISO date string for the Monday
  leads: Lead[];
  userContext: UserContext;
}

export interface UserContext {
  senderName: string;
  valueProposition: string;
  targetRoleType: string;
  targetCompanyType: string;
  apiKey: string;
}

export interface DayProgress {
  total: number;
  done: number;
  skipped: number;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4;
export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
};
