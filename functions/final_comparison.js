// Final comparison: our data vs what cumulative enrollment graph should show
// The cumulative graph counts: "Enrolled" + "Enrolled After Count Day (no funding)" only
// Pending is shown as a separate dashed line
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  const years = ['2023-24', '2024-25', '2025-26', '2026-27'];

  console.log('=== Comparison: Our Dashboard vs Cumulative Enrollment Graph ===\n');
  console.log('Cumulative graph counts: Enrolled + Enrolled After Count Day (no funding)');
  console.log('Our dashboard (isActiveEnrollment) also includes: Pending Enrolled, Re-enrolled, Waitlist\n');

  for (const year of years) {
    const students = await db.collection('students')
      .where('schoolYear', '==', year)
      .get();

    let enrolled = 0, enrolledAfterCD = 0, pending = 0, reEnrolled = 0, waitlist = 0, other = 0;
    students.docs.forEach(d => {
      const s = d.data().enrollmentStatus || '';
      if (s === 'Enrolled') enrolled++;
      else if (s === 'Enrolled After Count Day (no funding)') enrolledAfterCD++;
      else if (s === 'Pending Enrolled') pending++;
      else if (s === 'Re-enrolled') reEnrolled++;
      else if (s === 'Waitlist') waitlist++;
      else other++;
    });

    const graphTotal = enrolled + enrolledAfterCD;
    const ourTotal = enrolled + enrolledAfterCD + pending + reEnrolled + waitlist;

    // Get timeline final cumulative
    const tl = await db.collection('enrollmentTimeline')
      .where('schoolYear', '==', year)
      .orderBy('weekNumber', 'asc')
      .get();
    const tlCum = tl.empty ? 0 : tl.docs[tl.docs.length - 1].data().cumulativeEnrollment;

    // Get snapshot
    const snap = await db.collection('snapshots')
      .where('schoolYear', '==', year)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const snapTotal = snap.empty ? 0 : snap.docs[0].data().metrics.totalEnrollment;

    console.log(`${year}:`);
    console.log(`  Enrolled: ${enrolled}, After Count Day: ${enrolledAfterCD}, Pending: ${pending}, Re-enrolled: ${reEnrolled}, Waitlist: ${waitlist}`);
    console.log(`  Cumulative graph would show: ${graphTotal} enrolled + ${pending} pending`);
    console.log(`  Our snapshot totalEnrollment: ${snapTotal}`);
    console.log(`  Our timeline final cumulative: ${tlCum}`);
    console.log();
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
