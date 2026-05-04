/**
 * Recalculate enrollment timelines for all active school years.
 * This applies the new date clamping logic without re-syncing from Airtable.
 *
 * Usage: npx tsx scripts/recalculate-timelines.ts
 */
import * as admin from 'firebase-admin';
import { calculateEnrollmentTimeline } from '../src/metrics';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  // Get settings to find active school years
  const settingsDoc = await db.collection('config').doc('settings').get();
  const settings = settingsDoc.data();
  const activeYears = settings?.activeSchoolYears || ['2023-24', '2024-25', '2025-26', '2026-27'];

  console.log(`Recalculating timelines for: ${activeYears.join(', ')}`);

  for (const year of activeYears) {
    console.log(`\n--- ${year} ---`);
    const timeline = await calculateEnrollmentTimeline(db, year);
    const finalWeek = timeline[timeline.length - 1];
    console.log(`  Weeks: ${timeline.length}`);
    console.log(`  Cumulative enrollment: ${finalWeek?.cumulativeEnrollment ?? 0}`);
    console.log(`  Date range: ${timeline[0]?.weekStart} – ${finalWeek?.weekStart}`);
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
