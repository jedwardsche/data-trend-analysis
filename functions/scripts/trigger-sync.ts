/**
 * Trigger a manual sync via the deployed Cloud Function.
 * This calls the deployed triggerManualSync function which has Airtable secrets access.
 *
 * Usage: npx tsx scripts/trigger-sync.ts
 */
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'che-kpi-analytics' });
const db = admin.firestore();

async function main() {
  console.log('NOTE: This script cannot trigger the Cloud Function directly (it needs Airtable secrets).');
  console.log('Please trigger a manual sync from the Admin page at https://che-kpi-analytics.web.app');
  console.log('Or use the Firebase Console to manually invoke triggerManualSync.');
  console.log('');
  console.log('After the sync completes, run: npx tsx scripts/check-status-breakdown.ts');
  console.log('to verify the enrollment status improvements.');
  process.exit(0);
}

main();
