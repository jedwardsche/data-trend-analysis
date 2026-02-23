const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  // Get sample syncedAt times for each year to understand when data was written
  for (const year of ['2023-24', '2024-25', '2025-26', '2026-27']) {
    // Get oldest syncedAt
    const oldest = await db.collection('students')
      .where('schoolYear', '==', year)
      .limit(5)
      .get();

    // Get a count
    const count = await db.collection('students').where('schoolYear', '==', year).count().get();

    console.log(`\n${year} (${count.data().count} total):`);
    oldest.docs.forEach(d => {
      console.log(`  ${d.data().firstName} ${d.data().lastName}: syncedAt=${d.data().syncedAt}`);
    });
  }

  // Also look at what happens if the base 2 sync goes through the fallback
  // The fallback assigns ALL base records to ALL base.schoolYears
  // But the base 2 School Year Text only has "2025-26" values
  // So if the fallback fires, it would assign 2025-26 records to 2023-24 and 2024-25
  // This would explain the data!

  // Let's check: are the 2023-24 and 2024-25 students a SUBSET of the 2025-26 students?
  const s2526 = await db.collection('students').where('schoolYear', '==', '2025-26').limit(500).get();
  const keys2526 = new Set(s2526.docs.map(d => d.data().studentKey));

  const s2324 = await db.collection('students').where('schoolYear', '==', '2023-24').limit(500).get();
  const keys2324 = s2324.docs.map(d => d.data().studentKey);
  const in2526 = keys2324.filter(k => keys2526.has(k)).length;
  console.log(`\n2023-24 students (first 500) also in 2025-26 (first 500): ${in2526} / ${keys2324.length}`);

  // Check: are 2023-24 students the BASE 2 students (appQpRPypqTqk6emb)?
  // The 25-26 base students would NOT all be in the 23-24 base
  // But if the fallback assigned 25-26 base students to 23-24, they would overlap with 25-26

  // From our Airtable fetch: base 2 has records where School Year Text = "2025-2026" only
  // So if those got assigned to 2023-24 via fallback, 2023-24 would mirror 25-26 students
  // But 2023-24 has 3715 while 2025-26 has 2852 — so they're NOT the same set

  // Actually 2023-24 = 2024-25 = 3715, but 2025-26 = 2852
  // The 3715 set is LARGER than 2025-26... where do the extra 863 come from?
  // 3715 - 2852 = 863 students in 2023-24 but NOT in 2025-26
  // These might be students who attended in 2023-24 but NOT currently enrolled in 2025-26

  // This suggests: 2023-24 data = ALL students who EVER attended (historical + current)
  // While 2025-26 data = only CURRENT students

  // So the 23-24/24-25 base fallback DID fire and assigned ALL base records to 2023-24 and 2024-25
  // The base 1 (25-26/26-27) records were 0 at that time? Or was this from an older sync?

  console.log('\nChecking if 2025-26 students are a subset of 2023-24...');
  const s2324full = [];
  let lastDoc = null;
  do {
    let q = db.collection('students').where('schoolYear', '==', '2023-24').limit(500);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    s2324full.push(...snap.docs.map(d => d.data().studentKey));
    lastDoc = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
  } while (lastDoc);

  const s2526full = [];
  let lastDoc2 = null;
  do {
    let q = db.collection('students').where('schoolYear', '==', '2025-26').limit(500);
    if (lastDoc2) q = q.startAfter(lastDoc2);
    const snap = await q.get();
    s2526full.push(...snap.docs.map(d => d.data().studentKey));
    lastDoc2 = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
  } while (lastDoc2);

  const keys2324Set = new Set(s2324full);
  const keys2526Set = new Set(s2526full);
  const inBoth = s2526full.filter(k => keys2324Set.has(k)).length;
  const only2324 = s2324full.filter(k => !keys2526Set.has(k)).length;
  const only2526 = s2526full.filter(k => !keys2324Set.has(k)).length;
  console.log(`2023-24: ${keys2324Set.size} unique keys`);
  console.log(`2025-26: ${keys2526Set.size} unique keys`);
  console.log(`In both: ${inBoth}`);
  console.log(`Only in 2023-24 (not 2025-26): ${only2324}`);
  console.log(`Only in 2025-26 (not 2023-24): ${only2526}`);

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
