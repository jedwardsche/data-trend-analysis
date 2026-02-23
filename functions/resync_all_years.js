// Re-sync all 4 years with Student Truth dates, then regenerate snapshots + timelines
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { syncAirtableData } = require('./lib/airtable');
const { calculateSnapshot, calculateEnrollmentTimeline } = require('./lib/metrics');

async function deleteCollection(collectionName, yearField, year) {
  let total = 0;
  let snapshot;
  do {
    snapshot = await db.collection(collectionName)
      .where(yearField, '==', year)
      .limit(400)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.docs.length;
  } while (!snapshot.empty);
  return total;
}

async function run() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.log('AIRTABLE_PAT not set'); process.exit(1); }

  const years = ['2023-24', '2024-25', '2025-26', '2026-27'];
  const settings = (await db.collection('config').doc('settings').get()).data();

  // Step 1: Re-sync each year
  for (const year of years) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`=== Syncing ${year} ===`);
    const result = await syncAirtableData(db, token, year);
    console.log(`Sync ${year}: processed=${result.processed}, errors=${result.errors.length}`);
  }

  // Step 2: Delete old snapshots and timelines, then regenerate
  for (const year of years) {
    console.log(`\n=== Regenerating ${year} ===`);
    const delSnap = await deleteCollection('snapshots', 'schoolYear', year);
    const delTl = await deleteCollection('enrollmentTimeline', 'schoolYear', year);
    console.log(`  Deleted ${delSnap} snapshots, ${delTl} timeline docs`);

    await calculateSnapshot(db, year, settings);
    console.log(`  Snapshot created`);

    await calculateEnrollmentTimeline(db, year);
    console.log(`  Timeline created`);
  }

  // Step 3: Verify
  console.log(`\n${'='.repeat(50)}`);
  console.log('=== Final verification ===');
  for (const year of years) {
    const students = await db.collection('students').where('schoolYear', '==', year).count().get();
    const snap = await db.collection('snapshots')
      .where('schoolYear', '==', year)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const tl = await db.collection('enrollmentTimeline')
      .where('schoolYear', '==', year)
      .count().get();

    const m = snap.empty ? null : snap.docs[0].data().metrics;
    console.log(`${year}: students=${students.data().count}, enrolled=${m?.totalEnrollment || 0}, timeline_weeks=${tl.data().count}`);

    // Date distribution
    const all = await db.collection('students').where('schoolYear', '==', year).get();
    const dist = {};
    all.docs.forEach(d => {
      const date = d.data().enrolledDate || '';
      const yearPrefix = date.substring(0, 4) || 'empty';
      dist[yearPrefix] = (dist[yearPrefix] || 0) + 1;
    });
    console.log(`  Date distribution: ${JSON.stringify(dist)}`);
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
