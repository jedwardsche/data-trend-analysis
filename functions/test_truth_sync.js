// Diagnostic: Test Student Truth lookup by syncing 2023-24
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { syncAirtableData } = require('./lib/airtable');

async function run() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.log('AIRTABLE_PAT not set'); process.exit(1); }

  // Before sync: sample existing 2023-24 student dates
  const before = await db.collection('students')
    .where('schoolYear', '==', '2023-24')
    .limit(5)
    .get();
  console.log('=== BEFORE sync: sample 2023-24 enrolledDates ===');
  before.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.firstName} ${data.lastName}: enrolledDate="${data.enrolledDate}"`);
  });

  console.log('\n=== Syncing 2023-24 ===');
  const result = await syncAirtableData(db, token, '2023-24');
  console.log(`\nResult: processed=${result.processed}, errors=${result.errors.length}`);

  // After sync: check if dates changed
  const after = await db.collection('students')
    .where('schoolYear', '==', '2023-24')
    .limit(10)
    .get();
  console.log('\n=== AFTER sync: sample 2023-24 enrolledDates ===');
  after.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.firstName} ${data.lastName}: enrolledDate="${data.enrolledDate}"`);
  });

  // Count how many have dates in 2023 vs 2025
  const all = await db.collection('students')
    .where('schoolYear', '==', '2023-24')
    .get();
  let dates2023 = 0, dates2024 = 0, dates2025 = 0, datesOther = 0, datesEmpty = 0;
  all.docs.forEach(d => {
    const date = d.data().enrolledDate || '';
    if (!date) datesEmpty++;
    else if (date.startsWith('2023')) dates2023++;
    else if (date.startsWith('2024')) dates2024++;
    else if (date.startsWith('2025')) dates2025++;
    else datesOther++;
  });
  console.log(`\n=== Date distribution for 2023-24 (${all.docs.length} students) ===`);
  console.log(`  2023: ${dates2023}`);
  console.log(`  2024: ${dates2024}`);
  console.log(`  2025: ${dates2025}`);
  console.log(`  Other: ${datesOther}`);
  console.log(`  Empty: ${datesEmpty}`);

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
