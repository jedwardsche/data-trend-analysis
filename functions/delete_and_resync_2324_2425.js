// Delete incorrect 2023-24 and 2024-25 student records, then re-sync both years
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function deleteByYear(year) {
  let total = 0;
  let snapshot;
  do {
    snapshot = await db.collection('students')
      .where('schoolYear', '==', year)
      .limit(400)
      .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.docs.length;
    console.log(`  Deleted ${total} so far...`);
  } while (!snapshot.empty);
  return total;
}

async function run() {
  console.log('=== Deleting 2023-24 students ===');
  const del2324 = await deleteByYear('2023-24');
  console.log(`Deleted ${del2324} records for 2023-24`);

  console.log('=== Deleting 2024-25 students ===');
  const del2425 = await deleteByYear('2024-25');
  console.log(`Deleted ${del2425} records for 2024-25`);

  // Verify
  const c2324 = await db.collection('students').where('schoolYear', '==', '2023-24').count().get();
  const c2425 = await db.collection('students').where('schoolYear', '==', '2024-25').count().get();
  console.log(`\nVerify — 2023-24: ${c2324.data().count}, 2024-25: ${c2425.data().count}`);

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
