// Regenerate enrollment timeline for 2023-24 and 2024-25
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { calculateEnrollmentTimeline } = require('./lib/metrics');

async function run() {
  for (const year of ['2023-24', '2024-25']) {
    console.log(`\n=== Calculating enrollment timeline for ${year} ===`);
    try {
      await calculateEnrollmentTimeline(db, year);
      console.log(`Done`);
    } catch (e) {
      console.error(`Error:`, e.message);
    }
  }

  // Show final snapshot metrics properly
  console.log('\n=== Final snapshot metrics ===');
  for (const year of ['2023-24', '2024-25', '2025-26', '2026-27']) {
    const snaps = await db.collection('snapshots')
      .where('schoolYear', '==', year)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (!snaps.empty) {
      const d = snaps.docs[0].data();
      const m = d.metrics || {};
      console.log(`${year}: totalEnrollment=${m.totalEnrollment}, returning=${m.returningStudents}, retentionRate=${m.retentionRate}`);
    } else {
      console.log(`${year}: no snapshot`);
    }
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
