const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function run() {
  for (const year of ['2023-24', '2024-25', '2025-26', '2026-27']) {
    const tl = await db.collection('enrollmentTimeline')
      .where('schoolYear', '==', year)
      .orderBy('weekNumber', 'asc')
      .get();

    console.log(`\n=== ${year}: ${tl.docs.length} weeks ===`);
    tl.docs.forEach(d => {
      const data = d.data();
      console.log(`  W${data.weekNumber} (${data.weekStart}): new=${data.newEnrollments}, cumulative=${data.cumulativeEnrollment}`);
    });
  }

  // Check: how many 2026-27 students have enrolledDate AND active status?
  const students = await db.collection('students')
    .where('schoolYear', '==', '2026-27')
    .get();

  let withDate = 0, withoutDate = 0, activeWithDate = 0;
  const { isActiveEnrollment } = require('./lib/types');

  students.docs.forEach(d => {
    const data = d.data();
    const active = isActiveEnrollment(data.enrollmentStatus || '');
    if (data.enrolledDate) {
      withDate++;
      if (active) activeWithDate++;
    } else {
      withoutDate++;
    }
  });
  console.log(`\n2026-27 students: total=${students.docs.length}, withDate=${withDate}, withoutDate=${withoutDate}, activeWithDate=${activeWithDate}`);

  // Sample 2026-27 students
  console.log('\nSample 2026-27 students:');
  students.docs.slice(0, 10).forEach(d => {
    const data = d.data();
    console.log(`  ${data.firstName} ${data.lastName}: status="${data.enrollmentStatus}", enrolledDate="${data.enrolledDate}"`);
  });

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
