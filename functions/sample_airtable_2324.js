// Fetch a small sample directly from Airtable base appQpRPypqTqk6emb (23-24/24-25 base)
// to see what the School Year Text field actually looks like
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  // Get the Airtable token from the secret (we can't access Cloud secrets locally)
  // Instead, let's get the config from Firestore
  const configDoc = await db.collection('config').doc('airtable').get();
  if (!configDoc.exists) {
    console.log('No config/airtable doc — using hardcoded config');
  }

  // Read the AIRTABLE_PAT from environment or prompt user
  const token = process.env.AIRTABLE_PAT;
  if (!token) {
    console.log('AIRTABLE_PAT env var not set. Checking what data we have in Firestore instead...');

    // Instead, analyze the raw School Year Text values we can infer from enrolled dates
    // Load ALL 3715 records from 2023-24 and look at the enrolled dates more carefully
    let all2324 = [];
    let lastDoc = null;
    do {
      let q = db.collection('students').where('schoolYear', '==', '2023-24').limit(500);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      all2324 = all2324.concat(snap.docs.map(d => d.data()));
      lastDoc = snap.docs.length === 500 ? snap.docs[snap.docs.length - 1] : null;
    } while (lastDoc);

    console.log(`Loaded ${all2324.length} 2023-24 records`);

    // The problem: ALL enrolled dates are 2025-xx
    // This means the "School Year Text" formula field returns ALL years the student attended
    // BUT the "Enrollment Date" field returns the MOST RECENT enrollment date
    // So records for 2023-24 students actually have:
    //   - School Year Text: "2023-2024, 2024-2025, 2025-2026" (all their years)
    //   - Enrollment Date: their 2025-26 enrollment date
    // This is why 2023-24 and 2024-25 both have 3715 students with 2025 dates

    // The REAL question: what is the correct way to get 2023-24 enrollment count?
    // Option 1: Count students whose enrollment date falls within Aug 2023 - Jun 2024
    //   -> NOT possible with current data (all dates are 2025)
    // Option 2: The School Year Text for a 2023-24-ONLY student would be "2023-2024" (single year)
    //   -> These are students who left before 2024-25

    // So: students ONLY in 2023-24 (not 2024-25) = students who left after 2023-24
    // These would be the "graduated" or "transferred out" students
    // From our data: 0 students are only in 2023-24 — meaning no one left

    // This suggests the base contains CURRENT records only, not historical snapshots
    // Students who left in 2023-24 are simply not in the base anymore (deleted or archived)

    // The correct 2023-24 count = students who have "2023-2024" in their School Year Text
    // But since every current student who was enrolled in 2023-24 also continued,
    // and those who left are gone from the base, we can't get the real 2023-24 count.

    // HOWEVER: the 2023-24 base has records labeled with the year.
    // Let's check: how many unique campuses exist in 2023-24 data?
    const campuses2324 = {};
    for (const s of all2324) {
      const c = s.campus || '(empty)';
      campuses2324[c] = (campuses2324[c] || 0) + 1;
    }
    console.log('\n2023-24 campus distribution (enrolled students only):');
    const enrolled2324 = all2324.filter(s => s.enrollmentStatus === 'Enrolled');
    console.log(`Enrolled students: ${enrolled2324.length}`);
    const campusEnrolled = {};
    enrolled2324.forEach(s => {
      campusEnrolled[s.campus || '(empty)'] = (campusEnrolled[s.campus || '(empty)'] || 0) + 1;
    });
    Object.entries(campusEnrolled).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([c, n]) => {
      console.log(`  ${c}: ${n}`);
    });

    // Key insight: the 2023-24 and 2024-25 BASES contain the same students because
    // Airtable's "School Year" linked field is a rollup of ALL years the student attended.
    // A student enrolled since 2023 has ALL years in their record.
    // A student who only enrolled in 2025-26 only has "2025-26" in their record.

    // The 2023-24 base was designed to track 23-24 and 24-25 students, but the School Year
    // Text field contains ALL historical years, not just the base's target years.

    // SOLUTION: Instead of using School Year Text to assign students to years,
    // we should use the ENROLLMENT DATE to determine which school year the student belongs to.
    // A student's 2023-24 enrollment = they have an enrollment date in Aug 2023 - Jun 2024.
    // But we don't have year-specific enrollment dates in the current Airtable structure.

    // What we CAN do: use the fact that 2023-24 base was for those years.
    // The base schoolYears config says ['2023-24', '2024-25'].
    // Instead of assigning by School Year Text, assign ALL records to ONLY the LATEST year
    // in the base's schoolYears that the student appears in.

    // Actually: looking at the data differently —
    // - The `School Year Text` field is a LOOKUP from the "School Year" linked table
    // - It returns all years the student has been enrolled
    // - For students in the 23-24/24-25 base, most have been there since 2023-24
    // - There's no way to get the 2023-24-specific enrollment count without a snapshot

    console.log('\nConclusion: The 23-24 base does not have year-specific enrollment snapshots.');
    console.log('All students in the base have their CURRENT enrollment date (2025), not 2023-24 date.');
    console.log('The School Year Text field lists ALL years, causing multi-year assignment.');
    console.log('\nTo get accurate 23-24 counts, we would need one of:');
    console.log('  1. A historical enrollment date field per year in Airtable');
    console.log('  2. A snapshot of the base as it was in 2023-24');
    console.log('  3. A field that shows the FIRST enrollment date (not current)');

    process.exit(0);
  }

  // If AIRTABLE_PAT is available, fetch a sample from the base
  const BASE_ID = 'appQpRPypqTqk6emb';
  const url = `https://api.airtable.com/v0/${BASE_ID}/Students?maxRecords=5&cellFormat=string&timeZone=America%2FDenver&userLocale=en-us`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resp.json();

  console.log(`Fetched ${data.records?.length || 0} records from 23-24/24-25 base`);

  if (data.records) {
    data.records.forEach((r, i) => {
      console.log(`\nRecord ${i+1}: id=${r.id}`);
      const interesting = [
        "Student's Legal First Name (as stated on their birth certificate)",
        "Student's Legal Last Name",
        "School Year Text",
        "Enrollment Date",
        "Status of Enrollment (from Student Truth)",
        "Campus (from Truth) (from Student Truth)"
      ];
      interesting.forEach(field => {
        if (r.fields[field] !== undefined) {
          console.log(`  ${field}: ${JSON.stringify(r.fields[field])}`);
        }
      });
      // Also show ALL field names
      if (i === 0) {
        console.log(`  ALL FIELDS: ${Object.keys(r.fields).join(', ')}`);
      }
    });
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
