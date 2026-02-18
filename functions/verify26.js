const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function run() {
  const snap = await db.collection('snapshots')
    .where('schoolYear', '==', '2026-27')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) {
    console.log('NO SNAPSHOT FOUND');
    process.exit(1);
  }
  const data = snap.docs[0].data();
  console.log('Snapshot found!');
  console.log('  createdAt:', data.createdAt);
  console.log('  metrics.totalEnrolled:', data.metrics && data.metrics.totalEnrolled);
  console.log('  campuses:', Object.keys(data.byCampus || {}).join(', '));

  const timeline = await db.collection('enrollmentTimeline')
    .where('schoolYear', '==', '2026-27')
    .orderBy('weekNumber', 'asc')
    .limit(3)
    .get();
  console.log('Timeline weeks found:', timeline.size);
  if (timeline.size > 0) {
    console.log('  First week:', JSON.stringify(timeline.docs[0].data()));
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
