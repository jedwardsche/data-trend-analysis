/**
 * Airtable Configuration Types
 */
export interface AirtableFieldMapping {
  firstName: string;
  lastName: string;
  dob: string;
  enrollmentStatus: string;
  campusName: string;
  mcLeader: string;
  created: string;
  lastModified: string;
  schoolYear?: string;
  graduationStatus?: string;
  transferStatus?: string;
}

export interface AttendanceFieldMapping {
  studentLink: string;
  date: string;
  status?: string;
}

export interface AbsenceFieldMapping {
  studentLink: string;
  date: string;
}

export interface StudentTruthFieldMapping {
  studentLink: string;
  dateEnrolled: string;
  enrollmentStatus: string;
  schoolYear: string;
  created: string;
}

export interface AirtableTableConfig {
  tableIdOrName: string;
  fields: AirtableFieldMapping | AttendanceFieldMapping | AbsenceFieldMapping | StudentTruthFieldMapping;
}

export interface AirtableBaseConfig {
  baseId: string;
  schoolYears: string[];
  label: string;
  tables: {
    students: AirtableTableConfig;
    studentTruth?: AirtableTableConfig;
    attendance?: AirtableTableConfig;
    absences?: AirtableTableConfig;
    campuses?: AirtableTableConfig;
  };
  attendanceMode: 'presence' | 'absence';
}

export interface AirtableConfig {
  bases: AirtableBaseConfig[];
}

/**
 * Firestore Document Types
 */
export interface StudentRecord {
  id: string;
  studentKey: string;
  firstName: string;
  lastName: string;
  dob: string;
  schoolYear: string;
  campus: string;
  mcLeader: string;
  campusKey: string;
  enrollmentStatus: string;
  enrolledDate: string;
  isReturningStudent: boolean;
  isReturningCampus: boolean;
  attendedAtLeastOnce: boolean;
  withdrawalDate: string | null;
  isVerifiedTransfer: boolean;
  isGraduate: boolean;
  syncedAt: string;
}

export interface CampusMetrics {
  campusName: string;
  mcLeader: string;
  totalEnrollment: number;
  returningStudents: number;
  newStudents: number;
  retentionRate: number;
  nonStarters: number;
  midYearWithdrawals: number;
  attendanceRate: number;
}

export interface SnapshotMetrics {
  totalEnrollment: number;
  returningStudents: number;
  newStudentsReturningCampuses: number;
  retentionRate: number;
  nonStarters: number;
  midYearWithdrawals: number;
  verifiedTransfers: number;
  attritionTotal: number;
  internalGrowth: number;
  newCampusGrowth: number;
  totalNewGrowth: number;
  netGrowth: number;
}

export interface Snapshot {
  id: string;
  schoolYear: string;
  snapshotDate: string;
  isCountDay: boolean;
  metrics: SnapshotMetrics;
  byCampus: Record<string, CampusMetrics>;
  createdAt: string;
  lockedAt: string | null;
}

export interface EnrollmentWeek {
  id: string;
  schoolYear: string;
  weekStart: string;
  weekNumber: number;
  newEnrollments: number;
  cumulativeEnrollment: number;
  byCampus: Record<string, {
    newEnrollments: number;
    cumulativeEnrollment: number;
  }>;
}

export interface AppSettings {
  erbocesPerStudentCost: number;
  countDayDate: string;
  currentSchoolYear: string;
  activeSchoolYears: string[];
  fundingByYear?: Record<string, number>;
}

export interface AllowedUser {
  email: string;
  isAdmin: boolean;
  addedAt: string;
}

/**
 * API Request/Response Types
 */
export interface GetDashboardDataRequest {
  schoolYear: string;
  view: 'overview' | 'campus' | 'yoy' | 'timeline' | 'campusYoYTimeline';
  campusKey?: string;
}

export interface GetSnapshotDataRequest {
  schoolYear: string;
  campusKey?: string;
}

export interface TriggerManualSyncRequest {
  schoolYear?: string;
}

export interface ExportPDFRequest {
  schoolYear: string;
  reportType: 'annual' | 'campus';
  campusKey?: string;
}

export interface ExportCSVRequest {
  schoolYear: string;
  dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline';
}

/**
 * Enrollment Status Constants
 */
export const ACTIVE_ENROLLMENT_STATUSES = [
  'Enrolled',
  'Pending Enrolled',
  'Re-enrolled',
  'Enrolled After Count Day (no funding)',
  'Waitlist'
] as const;

export type ActiveEnrollmentStatus = typeof ACTIVE_ENROLLMENT_STATUSES[number];

/**
 * Helper Functions
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

export function formatDate(date: Date | string): string {
  if (!date) return '';
  try {
    const str = typeof date === 'string' ? date.trim() : '';

    if (str) {
      // Try M/D/YYYY format first (Airtable cellFormat=string with en-us)
      const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdyMatch) {
        const [, m, d, y] = mdyMatch;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // Try YYYY-MM-DD (already ISO)
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return isoMatch[0];
      }
    }

    // Fallback to Date constructor
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function createStudentKey(firstName: string, lastName: string, dob: string): string {
  const formattedDob = formatDate(dob) || normalizeString(dob);
  // Replace forward slashes to prevent Firestore subcollection creation
  const safeDob = formattedDob.replace(/\//g, '-');
  return `${normalizeString(firstName)}|${normalizeString(lastName)}|${safeDob}`;
}

export function createCampusKey(campusName: string, mcLeader: string): string {
  return `${normalizeString(campusName)}|${normalizeString(mcLeader)}`;
}

export function isActiveEnrollment(status: string): boolean {
  return ACTIVE_ENROLLMENT_STATUSES.includes(status as ActiveEnrollmentStatus);
}
