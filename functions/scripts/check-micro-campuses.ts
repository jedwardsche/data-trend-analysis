import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  const docs = await db.collection('students').where('schoolYear', '==', '2025-26').get();
  const students = docs.docs.map(d => d.data());
  const micro = students.filter(s => s.campus && s.campus.toLowerCase().includes('micro'));

  // Unique campus + leader combos
  const combos = new Map<string, number>();
  for (const s of micro) {
    const key = `${s.campus} | ${s.mcLeader || '(no leader)'}`;
    combos.set(key, (combos.get(key) || 0) + 1);
  }
  console.log('Unique micro-campus + leader combos (25-26):');
  for (const [k, v] of [...combos.entries()].sort((a, b) => b - a)) {
    console.log(`  ${v.toString().padStart(5)}  ${k}`);
  }
  console.log(`\nTotal micro students: ${micro.length}`);

  // Check raw campus field values
  const rawCampusValues = new Map<string, number>();
  for (const s of micro) {
    rawCampusValues.set(s.campus, (rawCampusValues.get(s.campus) || 0) + 1);
  }
  console.log('\nRaw campus names:');
  for (const [k, v] of [...rawCampusValues.entries()].sort((a, b) => b - a)) {
    console.log(`  ${v.toString().padStart(5)}  "${k}"`);
  }

  // Check campusKey values
  const keys = new Map<string, number>();
  for (const s of micro) {
    keys.set(s.campusKey, (keys.get(s.campusKey) || 0) + 1);
  }
  console.log('\nCampus keys:');
  for (const [k, v] of [...keys.entries()].sort((a, b) => b - a)) {
    console.log(`  ${v.toString().padStart(5)}  "${k}"`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
