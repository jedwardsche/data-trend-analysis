// Regenerate snapshots for 2023-24 and 2024-25
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { calculateSnapshot } = require('./lib/metrics');

async function run() {
  // First delete old snapshots for these years
  for (const year of ['2023-24', '2024-25']) {
    const snap = await db.collection('snapshots').where('schoolYear', '==', year).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`Deleted ${snap.docs.length} old snapshots for ${year}`);
    }
  }

  // Also delete old enrollment timeline entries
  for (const year of ['2023-24', '2024-25']) {
    const snap = await db.collection('enrollmentTimeline').where('schoolYear', '==', year).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`Deleted ${snap.docs.length} old enrollmentTimeline docs for ${year}`);
    }
  }

  // Load settings
  const settingsDoc = await db.collection('config').doc('settings').get();
  const settings = settingsDoc.data();
  console.log('Settings:', JSON.stringify(settings));

  // Regenerate snapshots
  for (const year of ['2023-24', '2024-25']) {
    console.log(`\n=== Calculating snapshot for ${year} ===`);
    try {
      const result = await calculateSnapshot(db, year, settings);
      console.log(`Result:`, JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(`Error for ${year}:`, e.message, e.stack);
    }
  }

  // Show final snapshot values
  console.log('\n=== Final snapshot values ===');
  for (const year of ['2023-24', '2024-25', '2025-26', '2026-27']) {
    const snaps = await db.collection('snapshots')
      .where('schoolYear', '==', year)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (!snaps.empty) {
      const d = snaps.docs[0].data();
      console.log(`${year}: enrolled=${d.totalEnrolled}, new=${d.newStudents}, returning=${d.returningStudents}, isCountDay=${d.isCountDay}`);
    } else {
      console.log(`${year}: no snapshot`);
    }
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
