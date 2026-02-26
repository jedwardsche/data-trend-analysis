"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSnapshot = calculateSnapshot;
exports.calculateEnrollmentTimeline = calculateEnrollmentTimeline;
const types_1 = require("./types");
const date_fns_1 = require("date-fns");
/**
 * Calculate snapshot metrics for a school year
 */
async function calculateSnapshot(db, schoolYear, settings) {
    // Fetch all students for this school year
    const studentsRef = db.collection('students');
    const studentDocs = await studentsRef
        .where('schoolYear', '==', schoolYear)
        .get();
    const students = studentDocs.docs.map(doc => doc.data());
    // Fetch prior year students for retention calculation
    const yearParts = schoolYear.split('-').map(p => parseInt(p));
    const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;
    const priorYearDocs = await studentsRef
        .where('schoolYear', '==', priorYear)
        .get();
    const priorYearStudents = priorYearDocs.docs.map(doc => doc.data());
    // Calculate eligible prior year students (excluding graduates)
    const eligiblePriorYear = priorYearStudents.filter(s => !s.isGraduate && (0, types_1.isActiveEnrollment)(s.enrollmentStatus));
    // Initialize metrics
    const metrics = {
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
    const byCampus = {};
    // Process each student
    for (const student of students) {
        const isActive = (0, types_1.isActiveEnrollment)(student.enrollmentStatus);
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
            }
            else if (student.isReturningCampus) {
                metrics.newStudentsReturningCampuses++;
                metrics.internalGrowth++;
            }
            else {
                metrics.newCampusGrowth++;
            }
            const campus = byCampus[student.campusKey];
            if (campus) {
                campus.totalEnrollment++;
                if (student.isReturningStudent) {
                    campus.returningStudents++;
                }
                else {
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
        }
        else if (student.withdrawalDate && !student.isVerifiedTransfer) {
            metrics.midYearWithdrawals++;
            if (byCampus[student.campusKey]) {
                byCampus[student.campusKey].midYearWithdrawals++;
            }
        }
        else if (student.isVerifiedTransfer) {
            metrics.verifiedTransfers++;
        }
    }
    // Carry forward campuses from the prior year that don't yet have students
    // in the current year, so they still appear on the Campuses page (even if
    // closed or not yet enrolling for the new year).
    for (const priorStudent of priorYearStudents) {
        if (priorStudent.campusKey && !byCampus[priorStudent.campusKey]) {
            byCampus[priorStudent.campusKey] = {
                campusName: priorStudent.campus,
                mcLeader: priorStudent.mcLeader,
                totalEnrollment: 0,
                returningStudents: 0,
                newStudents: 0,
                retentionRate: 0,
                nonStarters: 0,
                midYearWithdrawals: 0,
                attendanceRate: 0
            };
        }
    }
    // Calculate derived metrics
    metrics.attritionTotal = metrics.nonStarters + metrics.midYearWithdrawals;
    metrics.totalNewGrowth = metrics.internalGrowth + metrics.newCampusGrowth;
    metrics.netGrowth = metrics.totalNewGrowth - metrics.midYearWithdrawals;
    // Calculate retention rate
    if (eligiblePriorYear.length > 0) {
        metrics.retentionRate = Math.round((metrics.returningStudents / eligiblePriorYear.length) * 100);
    }
    // Calculate campus-level retention rates
    const priorYearByCampus = new Map();
    for (const student of eligiblePriorYear) {
        const count = priorYearByCampus.get(student.campusKey) || 0;
        priorYearByCampus.set(student.campusKey, count + 1);
    }
    for (const [campusKey, campus] of Object.entries(byCampus)) {
        const priorCount = priorYearByCampus.get(campusKey) || 0;
        if (priorCount > 0) {
            campus.retentionRate = Math.round((campus.returningStudents / priorCount) * 100);
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
        : `${schoolYear}-${(0, date_fns_1.format)(today, 'yyyy-MM-dd-HHmmss')}`;
    // isCountDay is only true for the explicitly locked Oct 1 snapshot
    const snapshot = {
        id: snapshotId,
        schoolYear,
        snapshotDate: (0, date_fns_1.format)(today, 'yyyy-MM-dd'),
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
function parseSchoolYearBoundaries(schoolYear) {
    const firstPart = schoolYear.split('-')[0].trim();
    let firstYear = parseInt(firstPart, 10);
    if (firstYear < 100)
        firstYear += 2000;
    return {
        start: new Date(firstYear, 0, 1), // Jan 1
        end: new Date(firstYear, 11, 31) // Dec 31
    };
}
/**
 * Calculate enrollment timeline (weekly enrollments)
 */
async function calculateEnrollmentTimeline(db, schoolYear) {
    // Parse school year boundaries for date clamping
    // Matches Python: "23-24" → Jan 1 2023 – Dec 31 2023
    const boundaries = parseSchoolYearBoundaries(schoolYear);
    // Fetch all students for this school year
    const studentsRef = db.collection('students');
    const studentDocs = await studentsRef
        .where('schoolYear', '==', schoolYear)
        .get();
    const students = studentDocs.docs
        .map(doc => doc.data())
        .filter(s => (0, types_1.isActiveEnrollment)(s.enrollmentStatus) && s.enrolledDate);
    // Group students by enrollment week
    const weeklyData = new Map();
    for (const student of students) {
        let enrollDate = (0, date_fns_1.parseISO)(student.enrolledDate);
        // Clamp to school year boundaries (matching Python _fetch_enrolled_by_school_year)
        // Ensures out-of-range dates (e.g., 23-24 data migration dates from 2024)
        // are clamped to the boundary rather than lost or misplaced
        if (enrollDate < boundaries.start) {
            enrollDate = boundaries.start;
        }
        else if (enrollDate > boundaries.end) {
            enrollDate = boundaries.end;
        }
        const weekStartDate = (0, date_fns_1.startOfWeek)(enrollDate, { weekStartsOn: 0 });
        const weekKey = (0, date_fns_1.format)(weekStartDate, 'yyyy-MM-dd');
        if (!weeklyData.has(weekKey)) {
            weeklyData.set(weekKey, {
                weekStart: weekStartDate,
                weekNumber: 0, // assigned sequentially after sorting
                students: [],
                byCampus: new Map()
            });
        }
        const week = weeklyData.get(weekKey);
        week.students.push(student);
        if (!week.byCampus.has(student.campusKey)) {
            week.byCampus.set(student.campusKey, []);
        }
        week.byCampus.get(student.campusKey).push(student);
    }
    // Convert to sorted array
    const sortedWeeks = Array.from(weeklyData.entries())
        .sort((a, b) => a[1].weekStart.getTime() - b[1].weekStart.getTime());
    // Calculate cumulative totals with sequential week numbering
    const timeline = [];
    let cumulativeTotal = 0;
    const cumulativeByCampus = new Map();
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
        const byCampus = {};
        for (const [campusKey, cumulative] of cumulativeByCampus) {
            const campusStudents = data.byCampus.get(campusKey);
            byCampus[campusKey] = {
                newEnrollments: campusStudents ? campusStudents.length : 0,
                cumulativeEnrollment: cumulative
            };
        }
        const enrollmentWeek = {
            id: `${schoolYear}-${weekKey}`, // date-based ID prevents collisions
            schoolYear,
            weekStart: (0, date_fns_1.format)(data.weekStart, 'yyyy-MM-dd'),
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
//# sourceMappingURL=metrics.js.map