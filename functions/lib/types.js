"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WITHDRAWAL_STATUSES = exports.NON_STARTER_STATUSES = exports.ACTIVE_ENROLLMENT_STATUSES = void 0;
exports.isNonStarterStatus = isNonStarterStatus;
exports.isWithdrawalStatus = isWithdrawalStatus;
exports.normalizeString = normalizeString;
exports.formatDate = formatDate;
exports.createStudentKey = createStudentKey;
exports.createCampusKey = createCampusKey;
exports.isActiveEnrollment = isActiveEnrollment;
/**
 * Enrollment Status Constants
 */
exports.ACTIVE_ENROLLMENT_STATUSES = [
    'Enrolled',
    'Pending Enrolled',
    'Re-enrolled',
    'Enrolled After Count Day (no funding)',
    'Waitlist'
];
/**
 * Non-starter statuses: student enrolled but never attended.
 * Match case-insensitively against enrollmentStatus.
 */
exports.NON_STARTER_STATUSES = [
    'Non-Starter',
    'No Show',
    'Never Attended',
    'Non Starter'
];
/**
 * Withdrawal / unenrollment statuses: student left or was removed.
 * "Unenrolled" and "Unenrolled After Count Day" are the primary attrition
 * statuses in the CHE Airtable data.
 * Match case-insensitively against enrollmentStatus.
 */
exports.WITHDRAWAL_STATUSES = [
    'Unenrolled',
    'Unenrolled After Count Day',
    'Withdrew',
    'Withdrawn',
    'Dropped',
    'Dropped Out',
    'Transferred',
    'Transferred Out',
    'Disenrolled',
    'Expelled',
    'Inactive'
];
function isNonStarterStatus(status) {
    const lower = status.toLowerCase().trim();
    return exports.NON_STARTER_STATUSES.some(s => lower === s.toLowerCase());
}
function isWithdrawalStatus(status) {
    const lower = status.toLowerCase().trim();
    return exports.WITHDRAWAL_STATUSES.some(s => lower === s.toLowerCase());
}
/**
 * Helper Functions
 */
function normalizeString(str) {
    return str.toLowerCase().trim();
}
function formatDate(date) {
    if (!date)
        return '';
    try {
        const str = typeof date === 'string' ? date.trim() : '';
        if (str) {
            // Try M/D/YYYY format first (Airtable cellFormat=string with en-us)
            const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (mdyMatch) {
                const [, m, d, y] = mdyMatch;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            // Try YYYY-MM-DD (already ISO)
            const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                return isoMatch[0];
            }
        }
        // Fallback to Date constructor
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return '';
        return d.toISOString().split('T')[0];
    }
    catch {
        return '';
    }
}
function createStudentKey(firstName, lastName, dob) {
    const formattedDob = formatDate(dob) || normalizeString(dob);
    // Replace forward slashes to prevent Firestore subcollection creation
    const safeDob = formattedDob.replace(/\//g, '-');
    return `${normalizeString(firstName)}|${normalizeString(lastName)}|${safeDob}`;
}
function createCampusKey(campusName, mcLeader) {
    return `${normalizeString(campusName)}|${normalizeString(mcLeader)}`;
}
function isActiveEnrollment(status) {
    return exports.ACTIVE_ENROLLMENT_STATUSES.includes(status);
}
//# sourceMappingURL=types.js.map