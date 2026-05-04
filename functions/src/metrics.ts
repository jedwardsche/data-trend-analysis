import type { Firestore } from 'firebase-admin/firestore';
import {
  StudentRecord,
  Snapshot,
  SnapshotMetrics,
  CampusMetrics,
  EnrollmentWeek,
  AppSettings,
  isActiveEnrollment,
  createCampusKey,
  isExcludedCampus
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

  const students = studentDocs.docs.map(doc => doc.data() as StudentRecord)
    .filter(s => !isExcludedCampus(s.campus, s.mcLeader));

  // Fetch prior year students for retention calculation
  const yearParts = schoolYear.split('-').map(p => parseInt(p));
  const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;

  const priorYearDocs = await studentsRef
    .where('schoolYear', '==', priorYear)
    .get();

  const priorYearStudents = priorYearDocs.docs.map(doc => doc.data() as StudentRecord)
    .filter(s => !isExcludedCampus(s.campus, s.mcLeader));

  // Prior year actively enrolled students — used as the denominator for retention rate.
  // Retention = returning students (this year) / total enrollment (last year).
  // Exclude graduates (12th grade / 12th grade second year) since they aren't expected to return.
  const isGraduatingGrade = (grade: string | undefined): boolean => {
    if (!grade) return false;
    const lower = grade.toLowerCase().trim();
    return /^12(th)?\b/.test(lower);
  };

  const priorYearActiveStudents = priorYearStudents.filter(s =>
    isActiveEnrollment(s.enrollmentStatus) && !isGraduatingGrade(s.gradeLevel)
  );

  // Initialize metrics
  const metrics: SnapshotMetrics = {
    totalEnrollment: 0,
    returningStudents: 0,
    newStudentsReturningCampuses: 0,
    retentionRate: 0,
    eligiblePriorYear: priorYearActiveStudents.length,
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

    // Ensure campus entry exists for ALL students (not just active ones)
    // so attrition metrics can be tracked at the campus level
    if (student.campusKey && !byCampus[student.campusKey]) {
      byCampus[student.campusKey] = {
        campusName: student.campus,
        mcLeader: student.mcLeader,
        totalEnrollment: 0,
        returningStudents: 0,
        newStudents: 0,
        retentionRate: 0,
        eligiblePriorYear: 0,
        nonStarters: 0,
        midYearWithdrawals: 0,
        attendanceRate: 0
      };
    }

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

      const campus = byCampus[student.campusKey];
      if (campus) {
        campus.totalEnrollment++;

        if (student.isReturningStudent) {
          campus.returningStudents++;
        } else {
          campus.newStudents++;
        }
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

  // Carry forward campuses from the prior year that don't yet have students
  // in the current year, so they still appear on the Campuses page (even if
  // closed or not yet enrolling for the new year).
  for (const priorStudent of priorYearStudents) {
    if (priorStudent.campusKey && !byCampus[priorStudent.campusKey] &&
        !isExcludedCampus(priorStudent.campus, priorStudent.mcLeader)) {
      byCampus[priorStudent.campusKey] = {
        campusName: priorStudent.campus,
        mcLeader: priorStudent.mcLeader,
        totalEnrollment: 0,
        returningStudents: 0,
        newStudents: 0,
        retentionRate: 0,
        eligiblePriorYear: 0,
        nonStarters: 0,
        midYearWithdrawals: 0,
        attendanceRate: 0
      };
    }
  }

  // Seed campuses from Truth table roster so campuses with zero students still appear.
  // Only filter by active status for the current year — past years keep existing behavior.
  const ACTIVE_CAMPUS_STATUSES = ['open', 'nearing capacity', 'waitlist', 'wait list', 'closed'];
  const rosterDoc = await db.collection('config').doc(`campusRoster-${schoolYear}`).get();
  // Track which roster leader maps to each byCampus key (for isNewCampus detection)
  const campusKeyToRosterLeader = new Map<string, string>();
  if (rosterDoc.exists) {
    const roster = rosterDoc.data() as Record<string, { campusName: string; mcLeader: string; status: string; requestedStudents: number }>;
    const isCurrentYear = schoolYear === settings.currentSchoolYear;

    // Build lookups from existing byCampus to match roster entries whose keys differ
    // due to MC leader consolidation (multi-name → single name in student sync).
    // Map: normalized campus name → existing campusKey(s)
    const existingByCampusName = new Map<string, string[]>();
    for (const [key, campus] of Object.entries(byCampus)) {
      const normalizedName = campus.campusName.toLowerCase().trim();
      if (!existingByCampusName.has(normalizedName)) {
        existingByCampusName.set(normalizedName, []);
      }
      existingByCampusName.get(normalizedName)!.push(key);
    }

    for (const [rosterKey, entry] of Object.entries(roster)) {
      // Exclude sandbox and training campuses
      if (isExcludedCampus(entry.campusName, entry.mcLeader)) continue;

      // For the current year, only include campuses with an active status
      if (isCurrentYear) {
        const statusLower = (entry.status || '').toLowerCase().trim();
        if (!ACTIVE_CAMPUS_STATUSES.includes(statusLower)) continue;
      }

      const rosterLeader = entry.mcLeader.includes(',')
        ? entry.mcLeader.split(',')[0].trim()
        : entry.mcLeader;

      // Try to find an existing byCampus entry that matches this roster campus.
      // The roster key may differ from the student-derived key because the Truth table
      // Staff field often has multiple comma-separated names while the student sync
      // consolidates to a single name.
      let matchedKey: string | null = null;

      // 1. Exact match on roster key
      if (byCampus[rosterKey]) {
        matchedKey = rosterKey;
      }

      // 2. Normalize mcLeader (take first comma-separated name) and try that key
      if (!matchedKey && entry.mcLeader.includes(',')) {
        const normalizedKey = createCampusKey(entry.campusName, rosterLeader);
        if (byCampus[normalizedKey]) {
          matchedKey = normalizedKey;
        }
      }

      // 3. For non-micro campuses, match by campus name alone if there's exactly one match
      if (!matchedKey) {
        const normalizedName = entry.campusName.toLowerCase().trim();
        const candidates = existingByCampusName.get(normalizedName) || [];
        if (candidates.length === 1) {
          matchedKey = candidates[0];
        }
      }

      if (matchedKey) {
        // Campus already exists — just apply status and track leader
        byCampus[matchedKey].status = entry.status || '';
        campusKeyToRosterLeader.set(matchedKey, rosterLeader);
      } else {
        // Truly new campus with no students yet — create entry with normalized key
        const newKey = createCampusKey(entry.campusName, rosterLeader);

        // Final guard: check the normalized key doesn't already exist
        if (!byCampus[newKey]) {
          byCampus[newKey] = {
            campusName: entry.campusName,
            mcLeader: rosterLeader,
            totalEnrollment: 0,
            returningStudents: 0,
            newStudents: 0,
            retentionRate: 0,
            eligiblePriorYear: 0,
            nonStarters: 0,
            midYearWithdrawals: 0,
            attendanceRate: 0
          };
        }
        byCampus[newKey].status = entry.status || '';
        campusKeyToRosterLeader.set(newKey, rosterLeader);
      }
    }
  }

  // Calculate derived metrics
  metrics.attritionTotal = metrics.nonStarters + metrics.midYearWithdrawals;
  metrics.totalNewGrowth = metrics.internalGrowth + metrics.newCampusGrowth;
  metrics.netGrowth = metrics.totalNewGrowth - metrics.midYearWithdrawals;

  // Apply requested students from Truth table (stored during Airtable sync)
  const requestedDoc = await db.collection('config').doc(`requestedStudents-${schoolYear}`).get();
  if (requestedDoc.exists) {
    const requestedData = requestedDoc.data() as Record<string, number>;
    // Sum ALL requested students from Truth table (including campuses with no enrollments yet)
    let totalRequestedStudents = 0;
    for (const [, count] of Object.entries(requestedData)) {
      if (count && count > 0) {
        totalRequestedStudents += count;
      }
    }
    // Build a fallback lookup by campus name only (without MC leader) for non-exact matches
    // Truth table keys often include MC leader names that don't match enrollment data
    const byCampusName = new Map<string, number>();
    for (const [key, count] of Object.entries(requestedData)) {
      if (count && count > 0) {
        const campusName = key.split('|')[0];
        byCampusName.set(campusName, (byCampusName.get(campusName) || 0) + count);
      }
    }
    // Apply per-campus requested counts: try exact key first, then fallback to campus name
    for (const [campusKey, campus] of Object.entries(byCampus)) {
      const requested = requestedData[campusKey];
      if (requested && requested > 0) {
        campus.requestedStudents = requested;
      } else {
        const campusName = campusKey.split('|')[0];
        const fallback = byCampusName.get(campusName);
        if (fallback && fallback > 0) {
          campus.requestedStudents = fallback;
        }
      }
    }
    if (totalRequestedStudents > 0) {
      metrics.requestedStudents = totalRequestedStudents;
    }
  }

  // Calculate retention rate: returning students as % of prior year total enrollment
  if (priorYearActiveStudents.length > 0) {
    metrics.retentionRate = Math.round(
      (metrics.returningStudents / priorYearActiveStudents.length) * 100
    );
  }

  // Calculate campus-level retention rates and detect new campuses
  const priorYearByCampus = new Map<string, number>();
  for (const student of priorYearActiveStudents) {
    const count = priorYearByCampus.get(student.campusKey) || 0;
    priorYearByCampus.set(student.campusKey, count + 1);
  }

  // Load prior year roster from Truth table for authoritative isNewCampus detection.
  // A campus is "new" if its MC leader didn't have a Truth record in the prior year.
  const priorRosterDoc = await db.collection('config').doc(`campusRoster-${priorYear}`).get();
  const priorYearLeaders = new Set<string>();
  if (priorRosterDoc.exists) {
    const priorRoster = priorRosterDoc.data() as Record<string, { campusName: string; mcLeader: string; status: string; requestedStudents: number }>;
    for (const entry of Object.values(priorRoster)) {
      if (isExcludedCampus(entry.campusName, entry.mcLeader)) continue;
      const leaderRaw = (entry.mcLeader || '').trim();
      if (leaderRaw) {
        // Add full name and each individual name (handles comma-separated multi-name leaders)
        priorYearLeaders.add(leaderRaw.toLowerCase());
        if (leaderRaw.includes(',')) {
          for (const name of leaderRaw.split(',')) {
            const trimmed = name.trim().toLowerCase();
            if (trimmed) priorYearLeaders.add(trimmed);
          }
        }
      }
    }
  }

  for (const [campusKey, campus] of Object.entries(byCampus)) {
    const priorCount = priorYearByCampus.get(campusKey) || 0;
    // Use the larger of priorCount and returningStudents as denominator so
    // retention never exceeds 100%.  Students who transfer between MC leaders
    // inflate returningStudents above priorCount for the receiving campus.
    const effectiveDenominator = Math.max(priorCount, campus.returningStudents);
    campus.eligiblePriorYear = effectiveDenominator;
    if (effectiveDenominator > 0) {
      campus.retentionRate = Math.round(
        (campus.returningStudents / effectiveDenominator) * 100
      );
    }

    // Detect new campuses using prior year Truth table roster.
    // A campus is new if its leader didn't have a Truth record in the prior year.
    if (priorYearLeaders.size > 0) {
      // Use roster-matched leader if available (authoritative), fall back to byCampus mcLeader
      const leader = campusKeyToRosterLeader.get(campusKey) || campus.mcLeader;
      const normalizedLeader = (leader || '').toLowerCase().trim();
      if (normalizedLeader) {
        campus.isNewCampus = !priorYearLeaders.has(normalizedLeader);
      } else {
        // No leader info available — fall back to student-based prior year check
        campus.isNewCampus = priorCount === 0;
      }
    } else {
      // No prior year roster — fall back to student-based check
      campus.isNewCampus = priorCount === 0;
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
 * Parse school year label into boundary dates.
 * Matches Python _parse_school_year_boundaries: "23-24" → Jan 1, 2023 – Dec 31, 2023.
 * All enrollment dates outside these boundaries are clamped to the nearest edge.
 */
function parseSchoolYearBoundaries(schoolYear: string): { start: Date; end: Date } {
  const firstPart = schoolYear.split('-')[0].trim();
  let firstYear = parseInt(firstPart, 10);
  if (firstYear < 100) firstYear += 2000;
  return {
    start: new Date(firstYear, 0, 1),  // Jan 1
    end: new Date(firstYear, 11, 31)   // Dec 31
  };
}

/**
 * Calculate enrollment timeline (weekly enrollments)
 */
export async function calculateEnrollmentTimeline(
  db: Firestore,
  schoolYear: string
): Promise<EnrollmentWeek[]> {
  // Parse school year boundaries for date clamping
  // Matches Python: "23-24" → Jan 1 2023 – Dec 31 2023
  const boundaries = parseSchoolYearBoundaries(schoolYear);

  // Fetch all students for this school year
  const studentsRef = db.collection('students');
  const studentDocs = await studentsRef
    .where('schoolYear', '==', schoolYear)
    .get();

  const students = studentDocs.docs
    .map(doc => doc.data() as StudentRecord)
    .filter(s => isActiveEnrollment(s.enrollmentStatus) && s.enrolledDate &&
      !isExcludedCampus(s.campus, s.mcLeader));

  // Group students by enrollment week
  const weeklyData = new Map<string, {
    weekStart: Date;
    weekNumber: number;
    students: StudentRecord[];
    byCampus: Map<string, StudentRecord[]>;
  }>();

  for (const student of students) {
    let enrollDate = parseISO(student.enrolledDate);

    // Clamp to school year boundaries (matching Python _fetch_enrolled_by_school_year)
    // Ensures out-of-range dates (e.g., 23-24 data migration dates from 2024)
    // are clamped to the boundary rather than lost or misplaced
    if (enrollDate < boundaries.start) {
      enrollDate = boundaries.start;
    } else if (enrollDate > boundaries.end) {
      enrollDate = boundaries.end;
    }

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

    // Update cumulative counts for campuses with new enrollments this week
    for (const [campusKey, campusStudents] of data.byCampus) {
      const campusCumulative = (cumulativeByCampus.get(campusKey) || 0) + campusStudents.length;
      cumulativeByCampus.set(campusKey, campusCumulative);
    }

    // Write ALL known campus cumulative values (not just those with new enrollments this week)
    // so the chart can read cumulative totals for every campus at every week
    const byCampus: Record<string, { newEnrollments: number; cumulativeEnrollment: number }> = {};
    for (const [campusKey, cumulative] of cumulativeByCampus) {
      const campusStudents = data.byCampus.get(campusKey);
      byCampus[campusKey] = {
        newEnrollments: campusStudents ? campusStudents.length : 0,
        cumulativeEnrollment: cumulative
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
