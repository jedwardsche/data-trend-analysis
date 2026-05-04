import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { syncAirtableData } from './airtable';
import { calculateSnapshot, calculateEnrollmentTimeline } from './metrics';
import { generatePDFReport, generateCSVExport } from './exports';
import { getDemographicsData } from './demographics';
import { importHistoricalData } from './historical-import';
import type {
  GetDashboardDataRequest,
  GetSnapshotDataRequest,
  TriggerManualSyncRequest,
  ExportPDFRequest,
  ExportCSVRequest,
  AppSettings,
  AllowedUser,
  Snapshot,
  EnrollmentWeek
} from './types';

// Initialize Firebase Admin
admin.initializeApp();

// Secrets
const airtableToken = defineSecret('AIRTABLE_PAT');
const lambdaEmailToken = defineSecret('LAMBDA_EMAIL_API_TOKEN');

// Firestore references
const db = admin.firestore();

/**
 * Validate user authentication and authorization
 */
async function validateUser(auth: { uid: string; token: { email?: string } } | undefined): Promise<{ email: string; isAdmin: boolean }> {
  if (!auth || !auth.token.email) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const email = auth.token.email.toLowerCase();
  const allowedUsersRef = db.collection('config').doc('allowedUsers');
  const doc = await allowedUsersRef.get();

  if (!doc.exists) {
    throw new HttpsError('permission-denied', 'Access not configured');
  }

  const users = doc.data()?.users as AllowedUser[] | undefined;
  const user = users?.find(u => u.email.toLowerCase() === email);

  if (!user) {
    throw new HttpsError('permission-denied', 'Access denied');
  }

  return { email, isAdmin: user.isAdmin };
}

/**
 * Validate admin access
 */
async function validateAdmin(auth: { uid: string; token: { email?: string } } | undefined): Promise<string> {
  const { email, isAdmin } = await validateUser(auth);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return email;
}

/**
 * Get app settings from Firestore
 */
async function getAppSettings(): Promise<AppSettings> {
  const settingsDoc = await db.collection('config').doc('settings').get();
  if (!settingsDoc.exists) {
    return {
      erbocesPerStudentCost: 11380,
      countDayDate: '10-01',
      currentSchoolYear: '2025-26',
      activeSchoolYears: ['2023-24', '2024-25', '2025-26']
    };
  }
  return settingsDoc.data() as AppSettings;
}

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Nightly sync - runs at 2:00 AM Mountain Time (9:00 AM UTC in winter, 8:00 AM UTC in summer)
 */
export const scheduledSync = onSchedule(
  {
    schedule: '0 9 * * *', // 9:00 AM UTC = 2:00 AM MT (MST)
    timeZone: 'America/Denver',
    secrets: [airtableToken],
    timeoutSeconds: 900,
    memory: '8GiB',
    cpu: 2
  },
  async () => {
    console.log('Starting scheduled Airtable sync...');

    try {
      const result = await syncAirtableData(db, airtableToken.value());
      console.log('Scheduled sync completed:', result);

      // Generate snapshots after sync
      const settings = await getAppSettings();
      for (const year of settings.activeSchoolYears) {
        await calculateSnapshot(db, year, settings);
      }

      // Generate enrollment timeline
      for (const year of settings.activeSchoolYears) {
        await calculateEnrollmentTimeline(db, year);
      }

    } catch (error) {
      console.error('Scheduled sync failed:', error);
      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Get dashboard data for a specific view
 */
export const getDashboardData = onCall<GetDashboardDataRequest>(
  { enforceAppCheck: false },
  async (request: CallableRequest<GetDashboardDataRequest>) => {
    const { isAdmin } = await validateUser(request.auth);

    const { schoolYear, view, campusKey } = request.data;
    const settings = await getAppSettings();

    switch (view) {
      case 'overview': {
        const snapshotRef = db.collection('snapshots')
          .where('schoolYear', '==', schoolYear)
          .orderBy('createdAt', 'desc')
          .limit(1);

        const snapshotDocs = await snapshotRef.get();
        if (snapshotDocs.empty) {
          return { snapshot: null, settings, isAdmin };
        }

        return {
          snapshot: snapshotDocs.docs[0].data() as Snapshot,
          settings,
          isAdmin
        };
      }

      case 'campus': {
        if (!campusKey) {
          throw new HttpsError('invalid-argument', 'campusKey required for campus view');
        }

        const snapshotRef = db.collection('snapshots')
          .where('schoolYear', '==', schoolYear)
          .orderBy('createdAt', 'desc')
          .limit(1);

        const snapshotDocs = await snapshotRef.get();
        if (snapshotDocs.empty) {
          return { campus: null };
        }

        const snapshot = snapshotDocs.docs[0].data() as Snapshot;
        return {
          campus: snapshot.byCampus[campusKey] || null,
          overall: snapshot.metrics
        };
      }

      case 'yoy': {
        const snapshots: Record<string, Snapshot> = {};

        for (const year of settings.activeSchoolYears) {
          // Always use the latest snapshot for each year
          const docs = await db.collection('snapshots')
            .where('schoolYear', '==', year)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          if (!docs.empty) {
            snapshots[year] = docs.docs[0].data() as Snapshot;
          }
        }

        return { snapshots, settings };
      }

      case 'timeline': {
        const timelineDocs = await db.collection('enrollmentTimeline')
          .where('schoolYear', '==', schoolYear)
          .orderBy('weekNumber', 'asc')
          .get();

        const timeline: EnrollmentWeek[] = timelineDocs.docs.map(
          doc => doc.data() as EnrollmentWeek
        );

        return { timeline };
      }

      case 'campusYoYTimeline': {
        const timelines: Record<string, EnrollmentWeek[]> = {};

        for (const year of settings.activeSchoolYears) {
          const docs = await db.collection('enrollmentTimeline')
            .where('schoolYear', '==', year)
            .orderBy('weekNumber', 'asc')
            .get();

          timelines[year] = docs.docs.map(doc => doc.data() as EnrollmentWeek);
        }

        return { timelines, settings };
      }

      case 'demographics': {
        const demographics = await getDemographicsData(db, schoolYear);
        return { demographics };
      }

      default:
        throw new HttpsError('invalid-argument', 'Invalid view type');
    }
  }
);

/**
 * Get snapshot data for a specific school year
 */
export const getSnapshotData = onCall<GetSnapshotDataRequest>(
  { enforceAppCheck: false },
  async (request: CallableRequest<GetSnapshotDataRequest>) => {
    await validateUser(request.auth);

    const { schoolYear, campusKey } = request.data;

    // Always get the latest snapshot for the requested year
    const docs = await db.collection('snapshots')
      .where('schoolYear', '==', schoolYear)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (docs.empty) {
      return { snapshot: null };
    }

    const snapshot = docs.docs[0].data() as Snapshot;

    if (campusKey) {
      return {
        campus: snapshot.byCampus[campusKey] || null,
        overall: snapshot.metrics
      };
    }

    return { snapshot };
  }
);

/**
 * Trigger manual sync (admin only)
 */
export const triggerManualSync = onCall<TriggerManualSyncRequest>(
  {
    enforceAppCheck: false,
    secrets: [airtableToken],
    timeoutSeconds: 900,
    memory: '8GiB',
    cpu: 2
  },
  async (request: CallableRequest<TriggerManualSyncRequest>) => {
    await validateAdmin(request.auth);

    const { schoolYear } = request.data;

    console.log('Starting manual sync...', schoolYear ? `for ${schoolYear}` : 'for all years');

    try {
      const result = await syncAirtableData(db, airtableToken.value(), schoolYear);

      // Diagnostic: count students after sync
      const afterSync = await db.collection('students').count().get();
      console.log(`[DIAG] Students after syncAirtableData: ${afterSync.data().count}`);

      // Regenerate snapshots
      const settings = await getAppSettings();
      const yearsToProcess = schoolYear ? [schoolYear] : settings.activeSchoolYears;

      for (const year of yearsToProcess) {
        await calculateSnapshot(db, year, settings);
        const afterSnap = await db.collection('students').count().get();
        console.log(`[DIAG] Students after calculateSnapshot(${year}): ${afterSnap.data().count}`);

        await calculateEnrollmentTimeline(db, year);
        const afterTimeline = await db.collection('students').count().get();
        console.log(`[DIAG] Students after calculateEnrollmentTimeline(${year}): ${afterTimeline.data().count}`);
      }

      return {
        success: true,
        message: 'Sync completed successfully',
        details: result
      };
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw new HttpsError('internal', 'Sync failed: ' + (error as Error).message);
    }
  }
);

/**
 * Export PDF report
 */
export const exportPDF = onCall<ExportPDFRequest>(
  { enforceAppCheck: false },
  async (request: CallableRequest<ExportPDFRequest>) => {
    await validateUser(request.auth);

    const { schoolYear, reportType, campusKey } = request.data;
    const settings = await getAppSettings();

    // Get snapshot data
    const snapshotDocs = await db.collection('snapshots')
      .where('schoolYear', '==', schoolYear)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshotDocs.empty) {
      throw new HttpsError('not-found', 'No data available for the requested school year');
    }

    const snapshot = snapshotDocs.docs[0].data() as Snapshot;

    // Get previous year snapshot for comparison
    const previousYearIndex = settings.activeSchoolYears.indexOf(schoolYear) - 1;
    let previousSnapshot: Snapshot | null = null;

    if (previousYearIndex >= 0) {
      const prevYear = settings.activeSchoolYears[previousYearIndex];
      const prevDocs = await db.collection('snapshots')
        .where('schoolYear', '==', prevYear)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!prevDocs.empty) {
        previousSnapshot = prevDocs.docs[0].data() as Snapshot;
      }
    }

    const { pdfBase64, fileName } = await generatePDFReport(
      snapshot,
      previousSnapshot,
      reportType,
      campusKey,
      settings
    );

    return { pdfBase64, fileName };
  }
);

/**
 * Export CSV data
 */
export const exportCSV = onCall<ExportCSVRequest>(
  { enforceAppCheck: false },
  async (request: CallableRequest<ExportCSVRequest>) => {
    await validateUser(request.auth);

    const { schoolYear, dataType } = request.data;

    const csv = await generateCSVExport(db, schoolYear, dataType);

    return { csv };
  }
);

/**
 * Get list of campuses for a school year
 */
export const getCampuses = onCall<{ schoolYear: string }>(
  { enforceAppCheck: false },
  async (request: CallableRequest<{ schoolYear: string }>) => {
    await validateUser(request.auth);

    const { schoolYear } = request.data;

    const snapshotDocs = await db.collection('snapshots')
      .where('schoolYear', '==', schoolYear)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshotDocs.empty) {
      return { campuses: [] };
    }

    const snapshot = snapshotDocs.docs[0].data() as Snapshot;

    const campuses = Object.entries(snapshot.byCampus).map(([key, data]) => ({
      key,
      name: data.campusName,
      mcLeader: data.mcLeader
    }));

    return { campuses };
  }
);

/**
 * Update app settings (admin only)
 */
export const updateSettings = onCall<Partial<AppSettings>>(
  { enforceAppCheck: false },
  async (request: CallableRequest<Partial<AppSettings>>) => {
    await validateAdmin(request.auth);

    const updates = request.data;

    await db.collection('config').doc('settings').set(updates, { merge: true });

    return { success: true };
  }
);

/**
 * Manage allowed users (admin only)
 */
/**
 * Import historical data from CSV (admin only)
 * Used for years without Airtable data (e.g., 2022-23)
 */
type ImportHistoricalDataRequest = {
  csvText: string;
  schoolYear: string;
};

export const importHistorical = onCall<ImportHistoricalDataRequest>(
  {
    enforceAppCheck: false,
    timeoutSeconds: 300,
    memory: '1GiB'
  },
  async (request: CallableRequest<ImportHistoricalDataRequest>) => {
    await validateAdmin(request.auth);

    const { csvText, schoolYear } = request.data;
    if (!csvText || !schoolYear) {
      throw new HttpsError('invalid-argument', 'csvText and schoolYear are required');
    }

    const settings = await getAppSettings();

    try {
      const result = await importHistoricalData(db, csvText, schoolYear, settings);

      // Add the year to activeSchoolYears if not already there
      if (!settings.activeSchoolYears.includes(schoolYear)) {
        const updatedYears = [...settings.activeSchoolYears, schoolYear].sort();
        await db.collection('config').doc('settings').set(
          { activeSchoolYears: updatedYears },
          { merge: true }
        );
      }

      return {
        success: true,
        message: `Imported ${result.studentsCreated} students for ${schoolYear}`,
        details: {
          studentsCreated: result.studentsCreated,
          studentsWithDemographics: result.studentsWithDemographics,
          returningIn2324: result.returningIn2324,
        }
      };
    } catch (error) {
      console.error('Historical import failed:', error);
      throw new HttpsError('internal', 'Import failed: ' + (error as Error).message);
    }
  }
);

/**
 * Check if an email is in the allowed users list (no auth required)
 * Also checks if the email already has a Google provider linked,
 * so the frontend can direct them to use Google sign-in instead.
 */
export const checkEmailAccess = onCall<{ email: string }>(
  { enforceAppCheck: false, cors: true },
  async (request: CallableRequest<{ email: string }>) => {
    const { email } = request.data;
    if (!email) {
      throw new HttpsError('invalid-argument', 'Email is required');
    }

    const allowedUsersRef = db.collection('config').doc('allowedUsers');
    const doc = await allowedUsersRef.get();

    if (!doc.exists) {
      return { allowed: false, hasGoogleProvider: false };
    }

    const users = doc.data()?.users as AllowedUser[] | undefined;
    const allowed = users?.some(u => u.email.toLowerCase() === email.toLowerCase()) ?? false;

    // Check if the email already has a Google auth provider linked
    let hasGoogleProvider = false;
    if (allowed) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
        hasGoogleProvider = userRecord.providerData.some(p => p.providerId === 'google.com');
      } catch {
        // User doesn't exist in Firebase Auth yet — that's fine
      }
    }

    return { allowed, hasGoogleProvider };
  }
);

/**
 * Send a sign-in link email via the CHE Lambda email service.
 * Generates the link server-side using Firebase Admin SDK, then
 * sends it through api.che.systems so it comes from noreply@che.systems.
 */
interface SendSignInLinkRequest {
  email: string;
  redirectUrl: string;
}

export const sendSignInLink = onCall<SendSignInLinkRequest>(
  { enforceAppCheck: false, cors: true, secrets: [lambdaEmailToken] },
  async (request: CallableRequest<SendSignInLinkRequest>) => {
    const { email, redirectUrl } = request.data;
    if (!email || !redirectUrl) {
      throw new HttpsError('invalid-argument', 'email and redirectUrl are required');
    }

    // Verify email is in allowed users list
    const allowedUsersRef = db.collection('config').doc('allowedUsers');
    const doc = await allowedUsersRef.get();
    const users = doc.data()?.users as AllowedUser[] | undefined;
    const allowed = users?.some(u => u.email.toLowerCase() === email.toLowerCase()) ?? false;

    if (!allowed) {
      throw new HttpsError('permission-denied', 'This email does not have access to the dashboard.');
    }

    // Check if email has Google provider
    try {
      const userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
      if (userRecord.providerData.some(p => p.providerId === 'google.com')) {
        throw new HttpsError('failed-precondition', 'This email is associated with Google sign-in.');
      }
    } catch (err) {
      // Re-throw our own HttpsErrors
      if (err instanceof HttpsError) throw err;
      // User doesn't exist in Firebase Auth yet — that's fine
    }

    // Generate the sign-in link using Admin SDK
    const actionCodeSettings = {
      url: redirectUrl,
      handleCodeInApp: true,
    };

    let signInLink: string;
    try {
      signInLink = await admin.auth().generateSignInWithEmailLink(
        email,
        actionCodeSettings
      );
    } catch (err) {
      console.error('Failed to generate sign-in link:', err);
      throw new HttpsError('internal', 'Failed to generate sign-in link');
    }

    // Send email via CHE Lambda email service
    const token = lambdaEmailToken.value();
    try {
      const response = await fetch('https://api.che.systems/email/sendmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': token,
        },
        body: JSON.stringify({
          to: email,
          subject: 'Sign in to CHE Enrollment Data',
          template: 'kpi-signin',
          buttonText: 'Sign In to Dashboard',
          buttonLink: signInLink,
          body: 'Click the button below to sign in to CHE Enrollment Data. No password needed. This link expires in 10 minutes.',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lambda email API error:', response.status, errorText);
        throw new HttpsError('internal', 'Failed to send sign-in email');
      }

      return { success: true, message: 'Sign-in link sent successfully' };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('Failed to send email:', err);
      throw new HttpsError('internal', 'Failed to send sign-in email');
    }
  }
);

type ManageUsersRequest = {
  action: 'add' | 'remove' | 'list';
  email?: string;
  isAdmin?: boolean;
};

export const manageAllowedUsers = onCall<ManageUsersRequest>(
  { enforceAppCheck: false },
  async (request: CallableRequest<ManageUsersRequest>) => {
    await validateAdmin(request.auth);

    const { action, email, isAdmin } = request.data;
    const usersRef = db.collection('config').doc('allowedUsers');

    switch (action) {
      case 'list': {
        const doc = await usersRef.get();
        return { users: doc.data()?.users || [] };
      }

      case 'add': {
        if (!email) {
          throw new HttpsError('invalid-argument', 'Email required');
        }

        const doc = await usersRef.get();
        const users: AllowedUser[] = doc.data()?.users || [];

        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          throw new HttpsError('already-exists', 'User already exists');
        }

        users.push({
          email: email.toLowerCase(),
          isAdmin: isAdmin || false,
          addedAt: new Date().toISOString()
        });

        await usersRef.set({ users });
        return { success: true };
      }

      case 'remove': {
        if (!email) {
          throw new HttpsError('invalid-argument', 'Email required');
        }

        const doc = await usersRef.get();
        const users: AllowedUser[] = doc.data()?.users || [];

        const filteredUsers = users.filter(
          u => u.email.toLowerCase() !== email.toLowerCase()
        );

        await usersRef.set({ users: filteredUsers });
        return { success: true };
      }

      default:
        throw new HttpsError('invalid-argument', 'Invalid action');
    }
  }
);
