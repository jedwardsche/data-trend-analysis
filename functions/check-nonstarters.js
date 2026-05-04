const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function check() {
  const docs = await db.collection('students')
    .where('schoolYear', '==', '2025-26')
    .get();

  const statuses = new Map();
  let nonStarterCount = 0;
  let attendedFalseCount = 0;

  docs.forEach(d => {
    const data = d.data();
    const s = data.enrollmentStatus || '(empty)';
    statuses.set(s, (statuses.get(s) || 0) + 1);
    if (data.attendedAtLeastOnce === false) attendedFalseCount++;
    const lower = s.toLowerCase();
    if (lower.includes('non-starter') || lower.includes('no show') || lower.includes('never attended') || lower === 'non starter') {
      nonStarterCount++;
    }
  });

  console.log('=== Enrollment Statuses (2025-26) ===');
  const sorted = [...statuses.entries()].sort((a,b) => b[1] - a[1]);
  sorted.forEach(([s, c]) => console.log('  ' + c + 'x  ' + JSON.stringify(s)));
  console.log('');
  console.log('Students with attendedAtLeastOnce=false:', attendedFalseCount);
  console.log('Students matching NON_STARTER_STATUSES:', nonStarterCount);
  console.log('Total students:', docs.size);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
