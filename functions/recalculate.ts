/**
 * Local script to:
 * 1. Update student records with derived attrition flags (attendedAtLeastOnce, withdrawalDate)
 * 2. Recalculate snapshots
 * 3. Recalculate enrollment timelines (with byCampus carry-forward fix)
 *
 * Run from the functions/ directory:
 *   npx tsx recalculate.ts
 */

import * as admin from 'firebase-admin';
import { calculateSnapshot, calculateEnrollmentTimeline } from './src/metrics';
import { isNonStarterStatus, isWithdrawalStatus } from './src/types';
import type { AppSettings, StudentRecord } from './src/types';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  console.log('Fetching app settings...');
  const settingsDoc = await db.collection('config').doc('settings').get();
  const settings = settingsDoc.data() as AppSettings;
  console.log('Active school years:', settings.activeSchoolYears);

  // Step 1: Update student records with derived attrition flags
  console.log('\n=== Step 1: Updating student attrition flags ===');
  const allStudents = await db.collection('students').get();
  console.log(`Total student records: ${allStudents.size}`);

  // Collect unique enrollment statuses for diagnostics
  const statusCounts = new Map<string, number>();
  let updatedCount = 0;
  let nonStarterCount = 0;
  let withdrawalCount = 0;

  const BATCH_SIZE = 499;
  const batches: admin.firestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const doc of allStudents.docs) {
    const student = doc.data() as StudentRecord;
    const status = student.enrollmentStatus || '';

    // Track status distribution
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

    const isNonStarter = isNonStarterStatus(status);
    const isWithdrawal = isWithdrawalStatus(status);

    // Only update if flags differ from current values
    const newAttendedAtLeastOnce = !isNonStarter;
    const newWithdrawalDate = isWithdrawal
      ? (student.enrolledDate || new Date().toISOString().split('T')[0])
      : null;

    if (
      student.attendedAtLeastOnce !== newAttendedAtLeastOnce ||
      student.withdrawalDate !== newWithdrawalDate
    ) {
      currentBatch.update(doc.ref, {
        attendedAtLeastOnce: newAttendedAtLeastOnce,
        withdrawalDate: newWithdrawalDate
      });
      updatedCount++;
      if (isNonStarter) nonStarterCount++;
      if (isWithdrawal) withdrawalCount++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    batches.push(currentBatch);
  }

  console.log(`\nEnrollment status distribution:`);
  const sortedStatuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [status, count] of sortedStatuses) {
    const flags = [];
    if (isNonStarterStatus(status)) flags.push('→ NON-STARTER');
    if (isWithdrawalStatus(status)) flags.push('→ WITHDRAWAL');
    console.log(`  "${status}": ${count} ${flags.join(' ')}`);
  }

  console.log(`\nUpdating ${updatedCount} student records (${nonStarterCount} non-starters, ${withdrawalCount} withdrawals)...`);
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`  Committed batch ${i + 1}/${batches.length}`);
  }

  // Step 2: Recalculate snapshots and timelines
  for (const year of settings.activeSchoolYears) {
    console.log(`\n=== Processing ${year} ===`);

    console.log(`  Calculating snapshot...`);
    const snapshot = await calculateSnapshot(db, year, settings);
    console.log(`  Snapshot: enrollment=${snapshot.metrics.totalEnrollment}, returning=${snapshot.metrics.returningStudents}, retention=${snapshot.metrics.retentionRate}%`);
    console.log(`  Attrition: nonStarters=${snapshot.metrics.nonStarters}, midYearWithdrawals=${snapshot.metrics.midYearWithdrawals}, total=${snapshot.metrics.attritionTotal}`);
    console.log(`  Campuses: ${Object.keys(snapshot.byCampus).length}`);

    // Log campus-level attrition
    for (const [, campus] of Object.entries(snapshot.byCampus)) {
      if (campus.nonStarters > 0 || campus.midYearWithdrawals > 0) {
        console.log(`    ${campus.campusName}: nonStarters=${campus.nonStarters}, withdrawals=${campus.midYearWithdrawals}`);
      }
    }

    console.log(`  Calculating enrollment timeline...`);
    const timeline = await calculateEnrollmentTimeline(db, year);
    console.log(`  Timeline: ${timeline.length} weeks`);

    // Log sample week's byCampus to verify carry-forward
    if (timeline.length > 0) {
      const lastWeek = timeline[timeline.length - 1];
      const campusCount = Object.keys(lastWeek.byCampus).length;
      console.log(`  Last week (${lastWeek.weekNumber}): ${campusCount} campuses with cumulative data, total=${lastWeek.cumulativeEnrollment}`);
    }
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
