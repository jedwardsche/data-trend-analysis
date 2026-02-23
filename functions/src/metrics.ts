import type { Firestore } from 'firebase-admin/firestore';
import {
  StudentRecord,
  Snapshot,
  SnapshotMetrics,
  CampusMetrics,
  EnrollmentWeek,
  AppSettings,
  isActiveEnrollment
} from './types';
import { format, startOfWeek, parseISO } from 'date-fns';

/**
 * Calculate snapshot metrics for a school year
 */
export async function calculateSnapshot(
  db: Firestore,
  schoolYear: string,
  settings: AppSettings
): Promise<Snapshot> {
  // Fetch all students for this school year
  const studentsRef = db.collection('students');
  const studentDocs = await studentsRef
    .where('schoolYear', '==', schoolYear)
    .get();

  const students = studentDocs.docs.map(doc => doc.data() as StudentRecord);

  // Fetch prior year students for retention calculation
  const yearParts = schoolYear.split('-').map(p => parseInt(p));
  const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;

  const priorYearDocs = await studentsRef
    .where('schoolYear', '==', priorYear)
    .get();

  const priorYearStudents = priorYearDocs.docs.map(doc => doc.data() as StudentRecord);

  // Calculate eligible prior year students (excluding graduates)
  const eligiblePriorYear = priorYearStudents.filter(s =>
    !s.isGraduate && isActiveEnrollment(s.enrollmentStatus)
  );

  // Initialize metrics
  const metrics: SnapshotMetrics = {
    totalEnrollment: 0,
    returningStudents: 0,
    newStudentsReturningCampuses: 0,
    retentionRate: 0,
    nonStarters: 0,
    midYearWithdrawals: 0,
    verifiedTransfers: 0,
    attritionTotal: 0,
    internalGrowth: 0,
    newCampusGrowth: 0,
    totalNewGrowth: 0,
    netGrowth: 0
  };

  const byCampus: Record<string, CampusMetrics> = {};

  // Process each student
  for (const student of students) {
    const isActive = isActiveEnrollment(student.enrollmentStatus);

    // Only count active enrollments in totals
    if (isActive) {
      metrics.totalEnrollment++;

      if (student.isReturningStudent) {
        metrics.returningStudents++;
      } else if (student.isReturningCampus) {
        metrics.newStudentsReturningCampuses++;
        metrics.internalGrowth++;
      } else {
        metrics.newCampusGrowth++;
      }

      // Initialize campus metrics if needed
      if (!byCampus[student.campusKey]) {
        byCampus[student.campusKey] = {
          campusName: student.campus,
          mcLeader: student.mcLeader,
          totalEnrollment: 0,
          returningStudents: 0,
          newStudents: 0,
          retentionRate: 0,
          nonStarters: 0,
          midYearWithdrawals: 0,
          attendanceRate: 0
        };
      }

      const campus = byCampus[student.campusKey];
      campus.totalEnrollment++;

      if (student.isReturningStudent) {
        campus.returningStudents++;
      } else {
        campus.newStudents++;
      }
    }

    // Track attrition
    if (!student.attendedAtLeastOnce && !student.isVerifiedTransfer) {
      metrics.nonStarters++;
      if (byCampus[student.campusKey]) {
        byCampus[student.campusKey].nonStarters++;
      }
    } else if (student.withdrawalDate && !student.isVerifiedTransfer) {
      metrics.midYearWithdrawals++;
      if (byCampus[student.campusKey]) {
        byCampus[student.campusKey].midYearWithdrawals++;
      }
    } else if (student.isVerifiedTransfer) {
      metrics.verifiedTransfers++;
    }
  }

  // Calculate derived metrics
  metrics.attritionTotal = metrics.nonStarters + metrics.midYearWithdrawals;
  metrics.totalNewGrowth = metrics.internalGrowth + metrics.newCampusGrowth;
  metrics.netGrowth = metrics.totalNewGrowth - metrics.midYearWithdrawals;

  // Calculate retention rate
  if (eligiblePriorYear.length > 0) {
    metrics.retentionRate = Math.round(
      (metrics.returningStudents / eligiblePriorYear.length) * 100
    );
  }

  // Calculate campus-level retention rates
  const priorYearByCampus = new Map<string, number>();
  for (const student of eligiblePriorYear) {
    const count = priorYearByCampus.get(student.campusKey) || 0;
    priorYearByCampus.set(student.campusKey, count + 1);
  }

  for (const [campusKey, campus] of Object.entries(byCampus)) {
    const priorCount = priorYearByCampus.get(campusKey) || 0;
    if (priorCount > 0) {
      campus.retentionRate = Math.round(
        (campus.returningStudents / priorCount) * 100
      );
    }
  }

  // Check if this should be the locked Oct 1 count-day snapshot
  const today = new Date();
  const countDayParts = settings.countDayDate.split('-').map(p => parseInt(p));
  const countDayMonth = countDayParts[0];
  const countDayDay = countDayParts[1];

  const currentYearNum = schoolYear.split('-')[0];
  const countDayDate = new Date(parseInt(currentYearNum), countDayMonth - 1, countDayDay);

  const isCurrentYear = schoolYear === settings.currentSchoolYear;

  // Only lock a count-day snapshot for the current year, and only once
  let shouldLock = false;
  if (isCurrentYear && today >= countDayDate) {
    const existingLocked = await db.collection('snapshots')
      .where('schoolYear', '==', schoolYear)
      .where('isCountDay', '==', true)
      .limit(1)
      .get();

    shouldLock = existingLocked.empty ||
      !existingLocked.docs.some(doc => doc.data().lockedAt != null);
  }

  const snapshotId = shouldLock
    ? `${schoolYear}-countday`
    : `${schoolYear}-${format(today, 'yyyy-MM-dd-HHmmss')}`;

  // isCountDay is only true for the explicitly locked Oct 1 snapshot
  const snapshot: Snapshot = {
    id: snapshotId,
    schoolYear,
    snapshotDate: format(today, 'yyyy-MM-dd'),
    isCountDay: shouldLock,
    metrics,
    byCampus,
    createdAt: new Date().toISOString(),
    lockedAt: shouldLock ? new Date().toISOString() : null
  };

  // Save snapshot
  await db.collection('snapshots').doc(snapshotId).set(snapshot);

  return snapshot;
}

/**
 * Calculate enrollment timeline (weekly enrollments)
 */
export async function calculateEnrollmentTimeline(
  db: Firestore,
  schoolYear: string
): Promise<EnrollmentWeek[]> {
  // Fetch all students for this school year
  const studentsRef = db.collection('students');
  const studentDocs = await studentsRef
    .where('schoolYear', '==', schoolYear)
    .get();

  const students = studentDocs.docs
    .map(doc => doc.data() as StudentRecord)
    .filter(s => isActiveEnrollment(s.enrollmentStatus) && s.enrolledDate);

  // Group students by enrollment week
  const weeklyData = new Map<string, {
    weekStart: Date;
    weekNumber: number;
    students: StudentRecord[];
    byCampus: Map<string, StudentRecord[]>;
  }>();

  for (const student of students) {
    const enrollDate = parseISO(student.enrolledDate);
    const weekStartDate = startOfWeek(enrollDate, { weekStartsOn: 0 });
    const weekKey = format(weekStartDate, 'yyyy-MM-dd');

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        weekStart: weekStartDate,
        weekNumber: 0, // assigned sequentially after sorting
        students: [],
        byCampus: new Map()
      });
    }

    const week = weeklyData.get(weekKey)!;
    week.students.push(student);

    if (!week.byCampus.has(student.campusKey)) {
      week.byCampus.set(student.campusKey, []);
    }
    week.byCampus.get(student.campusKey)!.push(student);
  }

  // Convert to sorted array
  const sortedWeeks = Array.from(weeklyData.entries())
    .sort((a, b) => a[1].weekStart.getTime() - b[1].weekStart.getTime());

  // Calculate cumulative totals with sequential week numbering
  const timeline: EnrollmentWeek[] = [];
  let cumulativeTotal = 0;
  const cumulativeByCampus = new Map<string, number>();
  let weekIndex = 1; // sequential week number

  for (const [weekKey, data] of sortedWeeks) {
    const newEnrollments = data.students.length;
    cumulativeTotal += newEnrollments;

    const byCampus: Record<string, { newEnrollments: number; cumulativeEnrollment: number }> = {};

    for (const [campusKey, campusStudents] of data.byCampus) {
      const campusCumulative = (cumulativeByCampus.get(campusKey) || 0) + campusStudents.length;
      cumulativeByCampus.set(campusKey, campusCumulative);

      byCampus[campusKey] = {
        newEnrollments: campusStudents.length,
        cumulativeEnrollment: campusCumulative
      };
    }

    const enrollmentWeek: EnrollmentWeek = {
      id: `${schoolYear}-${weekKey}`, // date-based ID prevents collisions
      schoolYear,
      weekStart: format(data.weekStart, 'yyyy-MM-dd'),
      weekNumber: weekIndex,
      newEnrollments,
      cumulativeEnrollment: cumulativeTotal,
      byCampus
    };

    timeline.push(enrollmentWeek);
    weekIndex++;
  }

  // Save to Firestore (handle batch size limit of 500)
  const timelineRef = db.collection('enrollmentTimeline');

  // Delete existing timeline for this year
  const existingDocs = await timelineRef
    .where('schoolYear', '==', schoolYear)
    .get();

  // Delete in batches
  const BATCH_SIZE = 499;
  for (let i = 0; i < existingDocs.docs.length; i += BATCH_SIZE) {
    const deleteBatch = db.batch();
    const chunk = existingDocs.docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      deleteBatch.delete(doc.ref);
    }
    await deleteBatch.commit();
  }

  // Add new timeline entries in batches
  for (let i = 0; i < timeline.length; i += BATCH_SIZE) {
    const writeBatch = db.batch();
    const chunk = timeline.slice(i, i + BATCH_SIZE);
    for (const week of chunk) {
      writeBatch.set(timelineRef.doc(week.id), week);
    }
    await writeBatch.commit();
  }

  return timeline;
}
