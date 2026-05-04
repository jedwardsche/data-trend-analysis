import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  const years = ['2023-24', '2024-25', '2025-26'];
  for (const year of years) {
    const docs = await db.collection('students').where('schoolYear', '==', year).get();
    const all = docs.docs.map(d => d.data());

    // Count by status
    const statusCounts: Record<string, number> = {};
    for (const s of all) {
      const status = s.enrollmentStatus || '(empty)';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    console.log(`\n=== ${year} (${all.length} total) ===`);
    const sorted = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    for (const [status, count] of sorted) {
      console.log(`  ${count.toString().padStart(5)} ${status}`);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
