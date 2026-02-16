/**
 * Seed script for initial Firestore configuration.
 * Run after deploying: npx ts-node src/seed.ts
 */
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function seed() {
  console.log('Seeding Firestore config...');

  // App settings
  await db.doc('config/settings').set({
    erbocesPerStudentCost: 11380,
    currentSchoolYear: '2025-26',
    availableYears: ['2023-24', '2024-25', '2025-26'],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  config/settings created');

  // Airtable base configs
  await db.doc('config/airtable').set({
    bases: [
      {
        baseId: 'appnol2rxwLMp4WfV',
        schoolYears: ['2025-26', '2026-27'],
        attendanceMode: 'absence',
        tables: {
          students: 'Students',
          enrollment: 'Student Truth',
          campuses: 'Truth',
          classes: 'Classes',
          attendance: 'Absent',
        },
      },
      {
        baseId: 'appQpRPypqTqk6emb',
        schoolYears: ['2023-24', '2024-25'],
        attendanceMode: 'presence',
        tables: {
          students: 'Students',
          enrollment: 'Student Truth',
          campuses: 'Truth',
          classes: 'Classes',
          attendance: 'Attendance',
        },
      },
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  config/airtable created');

  // Allowed users (seed with admin user)
  await db.doc('config/allowedUsers').set({
    users: [
      {
        email: 'jedwards@che.school',
        isAdmin: true,
        addedAt: new Date().toISOString(),
      },
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  config/allowedUsers created');

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
