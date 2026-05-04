/**
 * Run a full Airtable sync + snapshot/timeline recalculation locally.
 * Reads the Airtable PAT from AIRTABLE_PAT environment variable.
 *
 * Usage: AIRTABLE_PAT=$(firebase functions:secrets:access AIRTABLE_PAT) npx tsx scripts/run-sync.ts
 */
import * as admin from 'firebase-admin';
import { syncAirtableData } from '../src/airtable';
import { calculateSnapshot, calculateEnrollmentTimeline } from '../src/metrics';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) {
    console.error('AIRTABLE_PAT env var is required.');
    console.error('Usage: AIRTABLE_PAT=$(firebase functions:secrets:access AIRTABLE_PAT) npx tsx scripts/run-sync.ts');
    process.exit(1);
  }

  console.log('=== Step 1: Sync from Airtable ===');
  await syncAirtableData(db, token);

  console.log('\n=== Step 2: Get settings ===');
  const settingsDoc = await db.collection('config').doc('settings').get();
  const settings = settingsDoc.data() as any;
  const years: string[] = settings?.activeSchoolYears || ['2023-24', '2024-25', '2025-26', '2026-27'];
  console.log(`Active years: ${years.join(', ')}`);

  console.log('\n=== Step 3: Recalculate snapshots ===');
  for (const year of years) {
    console.log(`\nCalculating snapshot for ${year}...`);
    const snapshot = await calculateSnapshot(db, year, settings);
    console.log(`  Total enrollment: ${snapshot.metrics.totalEnrollment}`);
    console.log(`  Returning students: ${snapshot.metrics.returningStudents}`);
    console.log(`  New growth: ${snapshot.metrics.totalNewGrowth}`);
  }

  console.log('\n=== Step 4: Recalculate timelines ===');
  for (const year of years) {
    console.log(`\nCalculating timeline for ${year}...`);
    const timeline = await calculateEnrollmentTimeline(db, year);
    const final = timeline[timeline.length - 1];
    console.log(`  Weeks: ${timeline.length}`);
    console.log(`  Cumulative enrollment: ${final?.cumulativeEnrollment ?? 0}`);
    console.log(`  Date range: ${timeline[0]?.weekStart} – ${final?.weekStart}`);
  }

  console.log('\n=== Done! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
