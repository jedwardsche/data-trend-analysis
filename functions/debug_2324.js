// Investigate why 2023-24 has 1340 students when real count should be ~700-800
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  // 1. What is the distribution of students by schoolYear field?
  console.log('=== 2023-24 student breakdown ===');

  // Total count
  const total = await db.collection('students').where('schoolYear', '==', '2023-24').count().get();
  console.log(`Total 2023-24 students: ${total.data().count}`);

  // Load all 2023-24 students (paginated)
  let all2324 = [];
  let lastDoc = null;
  do {
    let q = db.collection('students').where('schoolYear', '==', '2023-24').limit(500);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    all2324 = all2324.concat(snap.docs.map(d => d.data()));
    lastDoc = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
  } while (lastDoc);
  console.log(`Loaded: ${all2324.length}`);

  // 2. Check enrolled dates — they should be in the 2023-24 school year range (Aug 2023 - Jun 2024)
  const datesBucket = { '2023': 0, '2024': 0, '2025': 0, '2026': 0, 'other': 0, 'empty': 0 };
  for (const s of all2324) {
    if (!s.enrolledDate) { datesBucket.empty++; continue; }
    const year = s.enrolledDate.substring(0, 4);
    if (datesBucket[year] !== undefined) datesBucket[year]++;
    else datesBucket.other++;
  }
  console.log('\nEnrolled dates by year:', JSON.stringify(datesBucket));

  // 3. Enrollment status counts
  const statusMap = {};
  for (const s of all2324) {
    const st = s.enrollmentStatus || '(empty)';
    statusMap[st] = (statusMap[st] || 0) + 1;
  }
  console.log('\nEnrollment status counts:');
  Object.entries(statusMap).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => console.log(`  "${s}": ${c}`));

  // 4. Are these students actually from the 25-26 base (appnol2rxwLMp4WfV)?
  // Check by looking at their student keys — are they the same as 2025-26 students?
  const total2526 = await db.collection('students').where('schoolYear', '==', '2025-26').count().get();
  console.log(`\n2025-26 total: ${total2526.data().count}`);

  let all2526sample = [];
  const snap2526 = await db.collection('students').where('schoolYear', '==', '2025-26').limit(100).get();
  all2526sample = snap2526.docs.map(d => d.data().studentKey);
  const keys2526Set = new Set(all2526sample);

  const keys2324 = new Set(all2324.map(s => s.studentKey));
  const overlapWith2526 = all2324.filter(s => keys2526Set.has(s.studentKey)).length;
  console.log(`2023-24 students also in 2025-26 sample (first 100): ${overlapWith2526} / ${all2324.length}`);

  // 5. Check student IDs — the doc ID format is "{year}-{studentKey}"
  // If 23-24 students have the same studentKey as 24-25 students, they're the same people
  const total2425 = await db.collection('students').where('schoolYear', '==', '2024-25').count().get();
  console.log(`\n2024-25 total: ${total2425.data().count}`);

  // Sample 10 students from 2023-24 and check if their key + enrolled date makes sense
  console.log('\nSample 2023-24 students:');
  all2324.slice(0, 15).forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName}: enrolledDate=${s.enrolledDate}, status=${s.enrollmentStatus}, campus=${s.campus}`);
  });

  // 6. The key question: does the Airtable sync assign a student to 2023-24
  // because their School Year Text field contains "2023-2024" (among other years)?
  // Check: how many 2023-24 students are NOT in 2024-25?
  let all2425keys = new Set();
  let lastDoc3 = null;
  do {
    let q = db.collection('students').where('schoolYear', '==', '2024-25').limit(500);
    if (lastDoc3) q = q.startAfter(lastDoc3);
    const snap = await q.get();
    snap.docs.forEach(d => all2425keys.add(d.data().studentKey));
    lastDoc3 = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
  } while (lastDoc3);

  const only2324 = all2324.filter(s => !all2425keys.has(s.studentKey)).length;
  const in2324and2425 = all2324.filter(s => all2425keys.has(s.studentKey)).length;
  console.log(`\n2023-24 students also in 2024-25: ${in2324and2425} / ${all2324.length}`);
  console.log(`2023-24 students ONLY in 2023-24 (not in 2024-25): ${only2324}`);

  // 7. The students ONLY in 2023-24 — what are their enrolled dates?
  const only2324students = all2324.filter(s => !all2425keys.has(s.studentKey));
  console.log(`\nStudents only in 2023-24 (sample of 10):`);
  only2324students.slice(0, 10).forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName}: enrolledDate=${s.enrolledDate}, status=${s.enrollmentStatus}`);
  });

  const only2324datesBucket = { '2023': 0, '2024': 0, '2025': 0, 'other': 0, 'empty': 0 };
  for (const s of only2324students) {
    if (!s.enrolledDate) { only2324datesBucket.empty++; continue; }
    const year = s.enrolledDate.substring(0, 4);
    if (only2324datesBucket[year] !== undefined) only2324datesBucket[year]++;
    else only2324datesBucket.other++;
  }
  console.log(`Only-2023-24 enrolled dates by year: ${JSON.stringify(only2324datesBucket)}`);

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
