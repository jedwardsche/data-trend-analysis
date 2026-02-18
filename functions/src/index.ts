import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { syncAirtableData } from './airtable';
import { calculateSnapshot, calculateEnrollmentTimeline } from './metrics';
import { generatePDFReport, generateCSVExport } from './exports';
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
    memory: '1GiB'
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
    await validateUser(request.auth);

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
          return { snapshot: null, settings };
        }

        return {
          snapshot: snapshotDocs.docs[0].data() as Snapshot,
          settings
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
          // Get locked (Oct 1) snapshot for historical years
          const isCurrentYear = year === settings.currentSchoolYear;
          const query = isCurrentYear
            ? db.collection('snapshots')
                .where('schoolYear', '==', year)
                .orderBy('createdAt', 'desc')
                .limit(1)
            : db.collection('snapshots')
                .where('schoolYear', '==', year)
                .where('isCountDay', '==', true)
                .limit(1);

          const docs = await query.get();
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
    const settings = await getAppSettings();

    // For current year, get latest snapshot
    // For past years, get Oct 1 locked snapshot
    const isCurrentYear = schoolYear === settings.currentSchoolYear;

    let query = isCurrentYear
      ? db.collection('snapshots')
          .where('schoolYear', '==', schoolYear)
          .orderBy('createdAt', 'desc')
          .limit(1)
      : db.collection('snapshots')
          .where('schoolYear', '==', schoolYear)
          .where('isCountDay', '==', true)
          .limit(1);

    const docs = await query.get();

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
    memory: '1GiB'
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
        .where('isCountDay', '==', true)
        .limit(1)
        .get();

      if (!prevDocs.empty) {
        previousSnapshot = prevDocs.docs[0].data() as Snapshot;
      }
    }

    const url = await generatePDFReport(
      snapshot,
      previousSnapshot,
      reportType,
      campusKey,
      settings
    );

    return { url, expiresIn: '1 hour' };
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
