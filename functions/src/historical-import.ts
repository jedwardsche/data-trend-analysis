import type { Firestore } from 'firebase-admin/firestore';
import {
  StudentRecord,
  Snapshot,
  SnapshotMetrics,
  CampusMetrics,
  EnrollmentWeek,
  AppSettings,
  createStudentKey,
  createCampusKey,
} from './types';
import { format, startOfWeek } from 'date-fns';

/**
 * CSV row from the attendance PDF export
 */
interface AttendanceRow {
  studentName: string; // "Last, First M." format
  sisNumber: string;
  grade: string;
}

/**
 * Parse CSV text into AttendanceRow[]
 * Expected format: Student Name, SIS Number, Grade
 */
function parseCSV(csvText: string): AttendanceRow[] {
  const lines = csvText.trim().split('\n');
  const rows: AttendanceRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split on comma, handling potential commas in names
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    // Try to detect header row
    if (parts[0].toLowerCase() === 'student name' ||
        parts[0].toLowerCase() === 'name' ||
        parts[0].toLowerCase().includes('student')) {
      continue;
    }

    // Name is "Last, First M." — first two parts are the name
    const lastName = parts[0].trim();
    const firstMiddle = parts[1].trim();
    const sisNumber = parts[2].trim();
    const grade = parts[3]?.trim() || '';

    // Skip if SIS doesn't look like a number
    if (!/^\d+$/.test(sisNumber)) continue;

    // Strip parentheses from names (indicates withdrawn but still count them)
    const cleanLast = lastName.replace(/[()]/g, '').trim();
    const cleanFirst = firstMiddle.replace(/[()]/g, '').trim();

    rows.push({
      studentName: `${cleanLast}, ${cleanFirst}`,
      sisNumber,
      grade,
    });
  }

  return rows;
}

/**
 * Parse "Last, First M." into { firstName, lastName }
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const cleanName = fullName.replace(/[()]/g, '').trim();
  const parts = cleanName.split(',').map(p => p.trim());
  const lastName = parts[0] || '';
  // First name is first word of the second part (strip middle initial)
  const firstPart = parts[1] || '';
  const firstName = firstPart.split(/\s+/)[0] || '';
  return { firstName, lastName };
}

/**
 * Map grade string from PDF to standard grade level
 */
function normalizeGrade(grade: string): string {
  const g = grade.trim();
  if (g === 'K') return 'Kindergarten';
  const num = parseInt(g, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${suffix} Grade`;
  }
  return g;
}

/**
 * Import historical data from CSV, cross-reference with existing years,
 * and create snapshot + timeline + student records.
 */
export async function importHistoricalData(
  db: Firestore,
  csvText: string,
  schoolYear: string,
  settings: AppSettings
): Promise<{
  studentsCreated: number;
  studentsWithDemographics: number;
  returningIn2324: number;
  snapshot: Snapshot;
}> {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    throw new Error('No valid student records found in CSV');
  }

  // Determine the next year for cross-referencing
  const yearParts = schoolYear.split('-').map(p => parseInt(p, 10));
  const nextYear = `${yearParts[0] + 1}-${yearParts[1] + 1}`;

  // Load next-year students from Firestore for cross-referencing
  // This tells us which 22-23 students returned in 23-24
  const nextYearDocs = await db.collection('students')
    .where('schoolYear', '==', nextYear)
    .get();

  const nextYearStudentKeys = new Set<string>();
  const nextYearStudentsByKey = new Map<string, StudentRecord>();

  for (const doc of nextYearDocs.docs) {
    const student = doc.data() as StudentRecord;
    nextYearStudentKeys.add(student.studentKey);
    nextYearStudentsByKey.set(student.studentKey, student);
  }

  // Also check years beyond next year for demographics fallback
  const futureYears = settings.activeSchoolYears.filter(y => y > nextYear).sort();
  const allFutureStudents = new Map<string, StudentRecord>();

  // Start with next year students
  for (const [key, student] of nextYearStudentsByKey) {
    allFutureStudents.set(key, student);
  }

  // Load additional future years
  for (const fy of futureYears) {
    const docs = await db.collection('students')
      .where('schoolYear', '==', fy)
      .get();
    for (const doc of docs.docs) {
      const student = doc.data() as StudentRecord;
      // Only add if not already found (prefer earliest match)
      if (!allFutureStudents.has(student.studentKey)) {
        allFutureStudents.set(student.studentKey, student);
      }
    }
  }

  // Build student records from the CSV data
  const campusName = 'Colorado Homeschool Enrichment';
  const mcLeader = '';
  const campusKey = createCampusKey(campusName, mcLeader);

  const students: StudentRecord[] = [];
  let studentsWithDemographics = 0;

  for (const row of rows) {
    const { firstName, lastName } = parseName(row.studentName);
    // We don't have DOB from the attendance sheet, so use SIS as a unique identifier
    const studentKey = createStudentKey(firstName, lastName, row.sisNumber);
    const docId = `${schoolYear}-${studentKey}`.replace(/\//g, '-');

    // Cross-reference: find this student in future years for demographics
    // Try matching by first+last name since we don't have DOB
    let matchedFutureStudent: StudentRecord | undefined;
    for (const [, futureStudent] of allFutureStudents) {
      const futureFirst = futureStudent.firstName.toLowerCase().trim();
      const futureLast = futureStudent.lastName.toLowerCase().trim();
      if (futureFirst === firstName.toLowerCase().trim() &&
          futureLast === lastName.toLowerCase().trim()) {
        matchedFutureStudent = futureStudent;
        break;
      }
    }

    const student: StudentRecord = {
      id: docId,
      studentKey,
      firstName,
      lastName,
      dob: '', // Not available from attendance sheet
      schoolYear,
      campus: campusName,
      mcLeader,
      campusKey,
      enrollmentStatus: 'Enrolled',
      enrolledDate: `${2000 + yearParts[0]}-08-01`, // Approximate: Aug 1 of school year start
      isReturningStudent: false, // First year of CHE, no prior year
      isReturningCampus: false,
      attendedAtLeastOnce: true,
      withdrawalDate: null,
      isVerifiedTransfer: false,
      isGraduate: false,
      syncedAt: new Date().toISOString(),
      gradeLevel: normalizeGrade(row.grade),
    };

    // Pull demographics from matched future student
    if (matchedFutureStudent) {
      studentsWithDemographics++;
      if (matchedFutureStudent.gender) student.gender = matchedFutureStudent.gender;
      if (matchedFutureStudent.race) student.race = matchedFutureStudent.race;
      if (matchedFutureStudent.ethnicity) student.ethnicity = matchedFutureStudent.ethnicity;
      if (matchedFutureStudent.primaryLanguage) student.primaryLanguage = matchedFutureStudent.primaryLanguage;
      if (matchedFutureStudent.homeLanguage) student.homeLanguage = matchedFutureStudent.homeLanguage;
      if (matchedFutureStudent.priorEducationalSetting) student.priorEducationalSetting = matchedFutureStudent.priorEducationalSetting;
      if (matchedFutureStudent.isMilitary) student.isMilitary = matchedFutureStudent.isMilitary;
      if (matchedFutureStudent.isHomeless) student.isHomeless = matchedFutureStudent.isHomeless;
      if (matchedFutureStudent.isImmigrant) student.isImmigrant = matchedFutureStudent.isImmigrant;
      if (matchedFutureStudent.address) student.address = matchedFutureStudent.address;
      if (matchedFutureStudent.city) student.city = matchedFutureStudent.city;
      if (matchedFutureStudent.state) student.state = matchedFutureStudent.state;
      if (matchedFutureStudent.zipCode) student.zipCode = matchedFutureStudent.zipCode;
    }

    students.push(student);
  }

  // Write student records to Firestore in batches
  const BATCH_SIZE = 499;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = students.slice(i, i + BATCH_SIZE);
    for (const student of chunk) {
      batch.set(db.collection('students').doc(student.id), student);
    }
    await batch.commit();
  }

  // Now update the NEXT year's students to mark which ones are returning
  // A 23-24 student is "returning" if they were in 22-23
  const currentStudentKeys = new Set(students.map(s => {
    // Match by name since the keys use SIS (no DOB) for 22-23
    return `${s.firstName.toLowerCase().trim()}|${s.lastName.toLowerCase().trim()}`;
  }));

  let returningIn2324 = 0;
  const nextYearUpdates: { docId: string; isReturning: boolean }[] = [];

  for (const doc of nextYearDocs.docs) {
    const student = doc.data() as StudentRecord;
    const nameKey = `${student.firstName.toLowerCase().trim()}|${student.lastName.toLowerCase().trim()}`;
    if (currentStudentKeys.has(nameKey)) {
      returningIn2324++;
      if (!student.isReturningStudent) {
        nextYearUpdates.push({ docId: doc.id, isReturning: true });
      }
    }
  }

  // Batch update next-year returning flags
  for (let i = 0; i < nextYearUpdates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = nextYearUpdates.slice(i, i + BATCH_SIZE);
    for (const update of chunk) {
      batch.update(db.collection('students').doc(update.docId), {
        isReturningStudent: true,
      });
    }
    await batch.commit();
  }

  // Build snapshot manually (since this is year 1, no prior year exists)
  const metrics: SnapshotMetrics = {
    totalEnrollment: students.length,
    returningStudents: 0, // First year — no prior year
    newStudentsReturningCampuses: 0,
    retentionRate: 0,
    eligiblePriorYear: 0, // No prior year
    nonStarters: 0,
    midYearWithdrawals: 0,
    verifiedTransfers: 0,
    attritionTotal: 0,
    internalGrowth: students.length, // All students are new growth
    newCampusGrowth: students.length,
    totalNewGrowth: students.length,
    netGrowth: students.length,
  };

  const byCampus: Record<string, CampusMetrics> = {
    [campusKey]: {
      campusName,
      mcLeader,
      totalEnrollment: students.length,
      returningStudents: 0,
      newStudents: students.length,
      retentionRate: 0,
      eligiblePriorYear: 0,
      nonStarters: 0,
      midYearWithdrawals: 0,
      attendanceRate: 0,
      isNewCampus: true,
    },
  };

  const snapshotId = `${schoolYear}-historical-import`;
  const snapshot: Snapshot = {
    id: snapshotId,
    schoolYear,
    snapshotDate: `${2000 + yearParts[0]}-11-01`, // Date from attendance sheet
    isCountDay: false,
    metrics,
    byCampus,
    createdAt: new Date().toISOString(),
    lockedAt: null,
  };

  await db.collection('snapshots').doc(snapshotId).set(snapshot);

  // Build enrollment timeline — single week since all enrolled at start of year
  const enrollDate = new Date(2000 + yearParts[0], 7, 1); // Aug 1
  const weekStartDate = startOfWeek(enrollDate, { weekStartsOn: 0 });
  const weekKey = format(weekStartDate, 'yyyy-MM-dd');

  const timelineWeek: EnrollmentWeek = {
    id: `${schoolYear}-${weekKey}`,
    schoolYear,
    weekStart: weekKey,
    weekNumber: 1,
    newEnrollments: students.length,
    cumulativeEnrollment: students.length,
    byCampus: {
      [campusKey]: {
        newEnrollments: students.length,
        cumulativeEnrollment: students.length,
      },
    },
  };

  // Delete any existing timeline for this year, then write
  const existingTimeline = await db.collection('enrollmentTimeline')
    .where('schoolYear', '==', schoolYear)
    .get();

  for (let i = 0; i < existingTimeline.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = existingTimeline.docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  await db.collection('enrollmentTimeline').doc(timelineWeek.id).set(timelineWeek);

  // Recalculate the 23-24 snapshot since we updated returning student flags
  if (settings.activeSchoolYears.includes(nextYear)) {
    const { calculateSnapshot: calcSnap } = await import('./metrics');
    await calcSnap(db, nextYear, settings);
  }

  return {
    studentsCreated: students.length,
    studentsWithDemographics,
    returningIn2324: returningIn2324,
    snapshot,
  };
}
