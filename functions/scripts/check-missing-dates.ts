import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

const ACTIVE_STATUSES = [
  'Enrolled', 'Pending Enrolled', 'Re-enrolled',
  'Enrolled After Count Day (no funding)', 'Waitlist'
];

async function main() {
  const years = ['2023-24', '2024-25', '2025-26', '2026-27'];
  for (const year of years) {
    const docs = await db.collection('students').where('schoolYear', '==', year).get();
    const all = docs.docs.map(d => d.data());
    const active = all.filter(s => ACTIVE_STATUSES.includes(s.enrollmentStatus));
    const withDate = active.filter(s => s.enrolledDate && s.enrolledDate.trim() !== '');
    const noDate = active.filter(s => !s.enrolledDate || s.enrolledDate.trim() === '');
    console.log(`${year}: total=${all.length}, active=${active.length}, withDate=${withDate.length}, noDate=${noDate.length}`);
    if (noDate.length > 0) {
      console.log('  Sample missing dates:', noDate.slice(0, 5).map(s =>
        `${s.firstName} ${s.lastName} (${s.enrollmentStatus})`
      ));
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
