/**
 * Snapshot Metrics
 */
export interface SnapshotMetrics {
  totalEnrollment: number;
  returningStudents: number;
  newStudentsReturningCampuses: number;
  retentionRate: number;
  eligiblePriorYear: number;
  nonStarters: number;
  midYearWithdrawals: number;
  verifiedTransfers: number;
  attritionTotal: number;
  internalGrowth: number;
  newCampusGrowth: number;
  totalNewGrowth: number;
  netGrowth: number;
  requestedStudents?: number;
}

/**
 * Campus Metrics
 */
export interface CampusMetrics {
  campusName: string;
  mcLeader: string;
  totalEnrollment: number;
  returningStudents: number;
  newStudents: number;
  retentionRate: number;
  eligiblePriorYear: number;
  nonStarters: number;
  midYearWithdrawals: number;
  attendanceRate: number;
  isNewCampus?: boolean;
  requestedStudents?: number;
}

/**
 * Snapshot
 */
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

/**
 * Enrollment Week (Timeline)
 */
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

/**
 * App Settings
 */
export interface YearFunding {
  students: number;
  perStudentCost: number;
}

export interface AppSettings {
  erbocesPerStudentCost: number;
  countDayDate: string;
  currentSchoolYear: string;
  activeSchoolYears: string[];
  fundingByYear?: Record<string, number | YearFunding>;
  nonStartersByYear?: Record<string, number>;
  projectedStudents?: number;
}

/**
 * Allowed User
 */
export interface AllowedUser {
  email: string;
  isAdmin: boolean;
  addedAt: string;
}

/**
 * Campus List Item
 */
export interface CampusListItem {
  key: string;
  name: string;
  mcLeader: string;
}

/**
 * Demographics
 */
export interface DemographicBreakdown {
  category: string;
  count: number;
  percent: number;
}

export interface ZipCodePoint {
  zipCode: string;
  lat: number;
  lng: number;
  count: number;
}

export interface CityCount {
  city: string;
  count: number;
}

export interface DemographicsData {
  totalStudents: number;
  gender: DemographicBreakdown[];
  race: DemographicBreakdown[];
  ethnicity: DemographicBreakdown[];
  primaryLanguage: DemographicBreakdown[];
  gradeLevel: DemographicBreakdown[];
  priorEducationalSetting: DemographicBreakdown[];
  isMilitary: DemographicBreakdown[];
  isHomeless: DemographicBreakdown[];
  isImmigrant: DemographicBreakdown[];
  exitDestination: DemographicBreakdown[];
  zipCodePoints: ZipCodePoint[];
  cityBreakdown: CityCount[];
}
