"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_ENROLLMENT_STATUSES = void 0;
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
    'Enrolled After Count Day (no funding)',
    'Waitlist'
];
/**
 * Helper Functions
 */
function normalizeString(str) {
    return str.toLowerCase().trim();
}
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}
function createStudentKey(firstName, lastName, dob) {
    return `${normalizeString(firstName)}|${normalizeString(lastName)}|${formatDate(dob)}`;
}
function createCampusKey(campusName, mcLeader) {
    return `${normalizeString(campusName)}|${normalizeString(mcLeader)}`;
}
function isActiveEnrollment(status) {
    return exports.ACTIVE_ENROLLMENT_STATUSES.includes(status);
}
//# sourceMappingURL=types.js.map