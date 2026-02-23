// Re-sync 2023-24 and 2024-25 using the corrected School Year field
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();
const { syncAirtableData } = require('./lib/airtable');

async function run() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.log('AIRTABLE_PAT not set'); process.exit(1); }

  console.log('=== Syncing 2023-24 ===');
  const r2324 = await syncAirtableData(db, token, '2023-24');
  console.log(`Result: processed=${r2324.processed}, errors=${r2324.errors.length}`);
  if (r2324.errors.length > 0) r2324.errors.forEach(e => console.log('  ERR:', e));

  console.log('\n=== Syncing 2024-25 ===');
  const r2425 = await syncAirtableData(db, token, '2024-25');
  console.log(`Result: processed=${r2425.processed}, errors=${r2425.errors.length}`);
  if (r2425.errors.length > 0) r2425.errors.forEach(e => console.log('  ERR:', e));

  // Final counts
  const c2324 = await db.collection('students').where('schoolYear', '==', '2023-24').count().get();
  const c2425 = await db.collection('students').where('schoolYear', '==', '2024-25').count().get();
  const c2526 = await db.collection('students').where('schoolYear', '==', '2025-26').count().get();
  const c2627 = await db.collection('students').where('schoolYear', '==', '2026-27').count().get();
  console.log('\n=== Final Firestore counts ===');
  console.log(`  2023-24: ${c2324.data().count}`);
  console.log(`  2024-25: ${c2425.data().count}`);
  console.log(`  2025-26: ${c2526.data().count}`);
  console.log(`  2026-27: ${c2627.data().count}`);

  process.exit(0);
}
run().catch(e => { console.error(e.message, e.stack); process.exit(1); });
