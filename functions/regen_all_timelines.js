// Regenerate enrollment timelines for all years with fixed week numbering
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { calculateEnrollmentTimeline } = require('./lib/metrics');

async function run() {
  const years = ['2023-24', '2024-25', '2025-26', '2026-27'];

  for (const year of years) {
    console.log(`\n=== Regenerating timeline for ${year} ===`);
    // Delete old docs first (the function also does this but the old IDs won't match new ones)
    let total = 0;
    let snap;
    do {
      snap = await db.collection('enrollmentTimeline')
        .where('schoolYear', '==', year)
        .limit(400)
        .get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      total += snap.docs.length;
    } while (!snap.empty);
    if (total > 0) console.log(`  Deleted ${total} old timeline docs`);

    const timeline = await calculateEnrollmentTimeline(db, year);
    console.log(`  Created ${timeline.length} weeks`);
    if (timeline.length > 0) {
      console.log(`  First: W${timeline[0].weekNumber} (${timeline[0].weekStart}) new=${timeline[0].newEnrollments} cum=${timeline[0].cumulativeEnrollment}`);
      const last = timeline[timeline.length - 1];
      console.log(`  Last:  W${last.weekNumber} (${last.weekStart}) new=${last.newEnrollments} cum=${last.cumulativeEnrollment}`);
    }
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
