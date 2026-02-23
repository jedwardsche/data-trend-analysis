// Compare our enrollment timeline data against expected values
// The cumulative enrollment graph at enroll.che.school uses Student Truth "Date Enrolled"
// Our sync now also uses Student Truth "Date Enrolled" — they should match
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  const years = ['2023-24', '2024-25', '2025-26', '2026-27'];

  for (const year of years) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== ${year} ===`);

    // Get all students for this year
    const students = await db.collection('students')
      .where('schoolYear', '==', year)
      .get();

    // Count by enrollment status
    const statusCounts = {};
    let activeCount = 0;
    const activeDates = [];

    students.docs.forEach(d => {
      const data = d.data();
      const status = data.enrollmentStatus || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Match what the cumulative graph counts: "Enrolled" and "Enrolled After Count Day (no funding)"
      if (status === 'Enrolled' || status === 'Enrolled After Count Day (no funding)') {
        activeCount++;
        if (data.enrolledDate) activeDates.push(data.enrolledDate);
      }
    });

    console.log(`Total students: ${students.docs.length}`);
    console.log(`Status breakdown:`);
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
      console.log(`  ${s}: ${c}`);
    });

    console.log(`\nEnrolled + Enrolled After Count Day: ${activeCount}`);

    // Also count "Pending Enrolled" (shown as separate line in cumulative graph)
    const pendingCount = statusCounts['Pending Enrolled'] || 0;
    console.log(`Pending Enrolled: ${pendingCount}`);

    // Date range for active students
    if (activeDates.length > 0) {
      activeDates.sort();
      console.log(`Date range: ${activeDates[0]} to ${activeDates[activeDates.length - 1]}`);

      // Monthly distribution
      const monthly = {};
      activeDates.forEach(d => {
        const month = d.substring(0, 7);
        monthly[month] = (monthly[month] || 0) + 1;
      });
      console.log(`Monthly enrollment distribution:`);
      Object.entries(monthly).sort().forEach(([m, c]) => {
        console.log(`  ${m}: ${c}`);
      });
    }

    // Get our enrollment timeline
    const timeline = await db.collection('enrollmentTimeline')
      .where('schoolYear', '==', year)
      .orderBy('weekNumber', 'asc')
      .get();

    if (!timeline.empty) {
      const lastWeek = timeline.docs[timeline.docs.length - 1].data();
      console.log(`\nTimeline: ${timeline.docs.length} weeks, final cumulative: ${lastWeek.cumulativeEnrollment}`);
    } else {
      console.log(`\nNo timeline data`);
    }

    // Get latest snapshot
    const snap = await db.collection('snapshots')
      .where('schoolYear', '==', year)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (!snap.empty) {
      const m = snap.docs[0].data().metrics;
      console.log(`Snapshot: totalEnrollment=${m.totalEnrollment}, returning=${m.returningStudents}`);
    }
  }

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
