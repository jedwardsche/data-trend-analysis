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
export declare const ACTIVE_ENROLLMENT_STATUSES: readonly ["Enrolled", "Pending Enrolled", "Re-enrolled", "Enrolled After Count Day (no funding)", "Waitlist"];
export type ActiveEnrollmentStatus = typeof ACTIVE_ENROLLMENT_STATUSES[number];
/**
 * Non-starter statuses: student enrolled but never attended.
 * Match case-insensitively against enrollmentStatus.
 */
export declare const NON_STARTER_STATUSES: readonly ["Non-Starter", "No Show", "Never Attended", "Non Starter"];
/**
 * Withdrawal / unenrollment statuses: student left or was removed.
 * "Unenrolled" and "Unenrolled After Count Day" are the primary attrition
 * statuses in the CHE Airtable data.
 * Match case-insensitively against enrollmentStatus.
 */
export declare const WITHDRAWAL_STATUSES: readonly ["Unenrolled", "Unenrolled After Count Day", "Withdrew", "Withdrawn", "Dropped", "Dropped Out", "Transferred", "Transferred Out", "Disenrolled", "Expelled", "Inactive"];
export declare function isNonStarterStatus(status: string): boolean;
export declare function isWithdrawalStatus(status: string): boolean;
/**
 * Helper Functions
 */
export declare function normalizeString(str: string): string;
export declare function formatDate(date: Date | string): string;
export declare function createStudentKey(firstName: string, lastName: string, dob: string): string;
export declare function createCampusKey(campusName: string, mcLeader: string): string;
export declare function isActiveEnrollment(status: string): boolean;
