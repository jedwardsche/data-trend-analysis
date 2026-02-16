"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageAllowedUsers = exports.updateSettings = exports.getCampuses = exports.exportCSV = exports.exportPDF = exports.triggerManualSync = exports.getSnapshotData = exports.getDashboardData = exports.scheduledSync = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const airtable_1 = require("./airtable");
const metrics_1 = require("./metrics");
const exports_1 = require("./exports");
// Initialize Firebase Admin
admin.initializeApp();
// Secrets
const airtableToken = (0, params_1.defineSecret)('AIRTABLE_PAT');
// Firestore references
const db = admin.firestore();
/**
 * Validate user authentication and authorization
 */
async function validateUser(auth) {
    if (!auth || !auth.token.email) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const email = auth.token.email.toLowerCase();
    const allowedUsersRef = db.collection('config').doc('allowedUsers');
    const doc = await allowedUsersRef.get();
    if (!doc.exists) {
        throw new https_1.HttpsError('permission-denied', 'Access not configured');
    }
    const users = doc.data()?.users;
    const user = users?.find(u => u.email.toLowerCase() === email);
    if (!user) {
        throw new https_1.HttpsError('permission-denied', 'Access denied');
    }
    return { email, isAdmin: user.isAdmin };
}
/**
 * Validate admin access
 */
async function validateAdmin(auth) {
    const { email, isAdmin } = await validateUser(auth);
    if (!isAdmin) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required');
    }
    return email;
}
/**
 * Get app settings from Firestore
 */
async function getAppSettings() {
    const settingsDoc = await db.collection('config').doc('settings').get();
    if (!settingsDoc.exists) {
        return {
            erbocesPerStudentCost: 11380,
            countDayDate: '10-01',
            currentSchoolYear: '2025-26',
            activeSchoolYears: ['2023-24', '2024-25', '2025-26']
        };
    }
    return settingsDoc.data();
}
// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================
/**
 * Nightly sync - runs at 2:00 AM Mountain Time (9:00 AM UTC in winter, 8:00 AM UTC in summer)
 */
exports.scheduledSync = (0, scheduler_1.onSchedule)({
    schedule: '0 9 * * *', // 9:00 AM UTC = 2:00 AM MT (MST)
    timeZone: 'America/Denver',
    secrets: [airtableToken],
    timeoutSeconds: 540,
    memory: '512MiB'
}, async () => {
    console.log('Starting scheduled Airtable sync...');
    try {
        const result = await (0, airtable_1.syncAirtableData)(db, airtableToken.value());
        console.log('Scheduled sync completed:', result);
        // Generate snapshots after sync
        const settings = await getAppSettings();
        for (const year of settings.activeSchoolYears) {
            await (0, metrics_1.calculateSnapshot)(db, year, settings);
        }
        // Generate enrollment timeline
        for (const year of settings.activeSchoolYears) {
            await (0, metrics_1.calculateEnrollmentTimeline)(db, year);
        }
    }
    catch (error) {
        console.error('Scheduled sync failed:', error);
        throw error;
    }
});
// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================
/**
 * Get dashboard data for a specific view
 */
exports.getDashboardData = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
                snapshot: snapshotDocs.docs[0].data(),
                settings
            };
        }
        case 'campus': {
            if (!campusKey) {
                throw new https_1.HttpsError('invalid-argument', 'campusKey required for campus view');
            }
            const snapshotRef = db.collection('snapshots')
                .where('schoolYear', '==', schoolYear)
                .orderBy('createdAt', 'desc')
                .limit(1);
            const snapshotDocs = await snapshotRef.get();
            if (snapshotDocs.empty) {
                return { campus: null };
            }
            const snapshot = snapshotDocs.docs[0].data();
            return {
                campus: snapshot.byCampus[campusKey] || null,
                overall: snapshot.metrics
            };
        }
        case 'yoy': {
            const snapshots = {};
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
                    snapshots[year] = docs.docs[0].data();
                }
            }
            return { snapshots, settings };
        }
        case 'timeline': {
            const timelineDocs = await db.collection('enrollmentTimeline')
                .where('schoolYear', '==', schoolYear)
                .orderBy('weekNumber', 'asc')
                .get();
            const timeline = timelineDocs.docs.map(doc => doc.data());
            return { timeline };
        }
        default:
            throw new https_1.HttpsError('invalid-argument', 'Invalid view type');
    }
});
/**
 * Get snapshot data for a specific school year
 */
exports.getSnapshotData = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
    const snapshot = docs.docs[0].data();
    if (campusKey) {
        return {
            campus: snapshot.byCampus[campusKey] || null,
            overall: snapshot.metrics
        };
    }
    return { snapshot };
});
/**
 * Trigger manual sync (admin only)
 */
exports.triggerManualSync = (0, https_1.onCall)({
    enforceAppCheck: false,
    secrets: [airtableToken],
    timeoutSeconds: 540,
    memory: '512MiB'
}, async (request) => {
    await validateAdmin(request.auth);
    const { schoolYear } = request.data;
    console.log('Starting manual sync...', schoolYear ? `for ${schoolYear}` : 'for all years');
    try {
        const result = await (0, airtable_1.syncAirtableData)(db, airtableToken.value(), schoolYear);
        // Diagnostic: count students after sync
        const afterSync = await db.collection('students').count().get();
        console.log(`[DIAG] Students after syncAirtableData: ${afterSync.data().count}`);
        // Regenerate snapshots
        const settings = await getAppSettings();
        const yearsToProcess = schoolYear ? [schoolYear] : settings.activeSchoolYears;
        for (const year of yearsToProcess) {
            await (0, metrics_1.calculateSnapshot)(db, year, settings);
            const afterSnap = await db.collection('students').count().get();
            console.log(`[DIAG] Students after calculateSnapshot(${year}): ${afterSnap.data().count}`);
            await (0, metrics_1.calculateEnrollmentTimeline)(db, year);
            const afterTimeline = await db.collection('students').count().get();
            console.log(`[DIAG] Students after calculateEnrollmentTimeline(${year}): ${afterTimeline.data().count}`);
        }
        return {
            success: true,
            message: 'Sync completed successfully',
            details: result
        };
    }
    catch (error) {
        console.error('Manual sync failed:', error);
        throw new https_1.HttpsError('internal', 'Sync failed: ' + error.message);
    }
});
/**
 * Export PDF report
 */
exports.exportPDF = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
        throw new https_1.HttpsError('not-found', 'No data available for the requested school year');
    }
    const snapshot = snapshotDocs.docs[0].data();
    // Get previous year snapshot for comparison
    const previousYearIndex = settings.activeSchoolYears.indexOf(schoolYear) - 1;
    let previousSnapshot = null;
    if (previousYearIndex >= 0) {
        const prevYear = settings.activeSchoolYears[previousYearIndex];
        const prevDocs = await db.collection('snapshots')
            .where('schoolYear', '==', prevYear)
            .where('isCountDay', '==', true)
            .limit(1)
            .get();
        if (!prevDocs.empty) {
            previousSnapshot = prevDocs.docs[0].data();
        }
    }
    const url = await (0, exports_1.generatePDFReport)(snapshot, previousSnapshot, reportType, campusKey, settings);
    return { url, expiresIn: '1 hour' };
});
/**
 * Export CSV data
 */
exports.exportCSV = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    await validateUser(request.auth);
    const { schoolYear, dataType } = request.data;
    const csv = await (0, exports_1.generateCSVExport)(db, schoolYear, dataType);
    return { csv };
});
/**
 * Get list of campuses for a school year
 */
exports.getCampuses = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
    const snapshot = snapshotDocs.docs[0].data();
    const campuses = Object.entries(snapshot.byCampus).map(([key, data]) => ({
        key,
        name: data.campusName,
        mcLeader: data.mcLeader
    }));
    return { campuses };
});
/**
 * Update app settings (admin only)
 */
exports.updateSettings = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    await validateAdmin(request.auth);
    const updates = request.data;
    await db.collection('config').doc('settings').set(updates, { merge: true });
    return { success: true };
});
exports.manageAllowedUsers = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
                throw new https_1.HttpsError('invalid-argument', 'Email required');
            }
            const doc = await usersRef.get();
            const users = doc.data()?.users || [];
            if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                throw new https_1.HttpsError('already-exists', 'User already exists');
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
                throw new https_1.HttpsError('invalid-argument', 'Email required');
            }
            const doc = await usersRef.get();
            const users = doc.data()?.users || [];
            const filteredUsers = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
            await usersRef.set({ users: filteredUsers });
            return { success: true };
        }
        default:
            throw new https_1.HttpsError('invalid-argument', 'Invalid action');
    }
});
//# sourceMappingURL=index.js.map