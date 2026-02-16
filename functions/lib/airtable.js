"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAirtableData = syncAirtableData;
const types_1 = require("./types");
/**
 * Fetch records from Airtable with pagination
 */
async function fetchAirtableRecords(baseId, tableIdOrName, token, filterByFormula) {
    const allRecords = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`);
        if (offset) {
            url.searchParams.set('offset', offset);
        }
        if (filterByFormula) {
            url.searchParams.set('filterByFormula', filterByFormula);
        }
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Airtable API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        allRecords.push(...data.records);
        offset = data.offset;
    } while (offset);
    return allRecords;
}
/**
 * Get Airtable config from Firestore
 */
async function getAirtableConfig(db) {
    const configDoc = await db.collection('config').doc('airtable').get();
    if (!configDoc.exists) {
        // Return default config based on user's bases
        return {
            bases: [
                {
                    baseId: 'appnol2rxwLMp4WfV',
                    schoolYears: ['2025-26', '2026-27'],
                    label: 'Students 25-26 & 26-27',
                    tables: {
                        students: {
                            tableIdOrName: 'Students',
                            fields: {
                                firstName: 'First Name',
                                lastName: 'Last Name',
                                dob: 'Date of Birth',
                                enrollmentStatus: 'Status of Enrollment',
                                campusName: 'Campus Name',
                                mcLeader: 'MC Leader',
                                created: 'Created',
                                lastModified: 'Last Modified',
                                schoolYear: 'School Year'
                            }
                        },
                        studentTruth: {
                            tableIdOrName: 'Student Truth',
                            fields: {
                                firstName: 'First Name',
                                lastName: 'Last Name',
                                dob: 'Date of Birth',
                                enrollmentStatus: 'Status of Enrollment',
                                campusName: 'Campus Name',
                                mcLeader: 'MC Leader',
                                created: 'Created',
                                lastModified: 'Last Modified',
                                schoolYear: 'School Year'
                            }
                        },
                        absences: {
                            tableIdOrName: 'Absent',
                            fields: {
                                studentLink: 'Student',
                                date: 'Date'
                            }
                        }
                    },
                    attendanceMode: 'absence'
                },
                {
                    baseId: 'appQpRPypqTqk6emb',
                    schoolYears: ['2023-24', '2024-25'],
                    label: 'Students 23-24 & 24-25',
                    tables: {
                        students: {
                            tableIdOrName: 'Students',
                            fields: {
                                firstName: 'First Name',
                                lastName: 'Last Name',
                                dob: 'Date of Birth',
                                enrollmentStatus: 'Status of Enrollment',
                                campusName: 'Campus Name',
                                mcLeader: 'MC Leader',
                                created: 'Created',
                                lastModified: 'Last Modified',
                                schoolYear: 'School Year'
                            }
                        },
                        attendance: {
                            tableIdOrName: 'Attendance',
                            fields: {
                                studentLink: 'Student',
                                date: 'Date',
                                status: 'Status'
                            }
                        }
                    },
                    attendanceMode: 'presence'
                }
            ]
        };
    }
    return configDoc.data();
}
/**
 * Get field value from Airtable record, handling linked records
 */
function getFieldValue(record, fieldName) {
    const value = record.fields[fieldName];
    if (value === undefined || value === null)
        return '';
    if (Array.isArray(value))
        return value[0]?.toString() || '';
    return value.toString();
}
/**
 * Process students from Airtable records
 */
function processStudents(records, baseConfig, targetYear) {
    const students = new Map();
    const fields = baseConfig.tables.students.fields;
    for (const record of records) {
        const recordYear = getFieldValue(record, fields.schoolYear || 'School Year');
        // Filter by school year if the base contains multiple years
        if (baseConfig.schoolYears.length > 1 && recordYear !== targetYear) {
            continue;
        }
        const firstName = getFieldValue(record, fields.firstName);
        const lastName = getFieldValue(record, fields.lastName);
        const dob = getFieldValue(record, fields.dob);
        if (!firstName || !lastName || !dob) {
            console.warn(`Skipping record ${record.id}: missing required fields`);
            continue;
        }
        const studentKey = (0, types_1.createStudentKey)(firstName, lastName, dob);
        const campus = getFieldValue(record, fields.campusName);
        const mcLeader = getFieldValue(record, fields.mcLeader);
        const enrollmentStatus = getFieldValue(record, fields.enrollmentStatus);
        students.set(studentKey, {
            studentKey,
            firstName,
            lastName,
            dob: (0, types_1.formatDate)(dob),
            schoolYear: targetYear,
            campus,
            mcLeader,
            campusKey: (0, types_1.createCampusKey)(campus, mcLeader),
            enrollmentStatus,
            enrolledDate: record.createdTime ? (0, types_1.formatDate)(record.createdTime) : '',
            isVerifiedTransfer: false,
            isGraduate: false,
            withdrawalDate: null
        });
    }
    return students;
}
/**
 * Get attendance data for students
 */
async function getAttendanceData(baseId, tableConfig, token, mode) {
    const records = await fetchAirtableRecords(baseId, tableConfig.tableIdOrName, token);
    const attendanceByStudent = new Map();
    for (const record of records) {
        const studentLink = record.fields[tableConfig.fields.studentLink];
        const date = getFieldValue(record, tableConfig.fields.date);
        if (!studentLink || !date)
            continue;
        // studentLink could be an array of record IDs
        const studentId = Array.isArray(studentLink) ? studentLink[0] : studentLink;
        if (typeof studentId !== 'string')
            continue;
        if (!attendanceByStudent.has(studentId)) {
            attendanceByStudent.set(studentId, new Set());
        }
        attendanceByStudent.get(studentId).add((0, types_1.formatDate)(date));
    }
    return attendanceByStudent;
}
/**
 * Determine if a student attended at least once
 */
function determineAttendance(_studentAirtableId, attendanceData, mode) {
    // Note: Currently using simplified logic based on presence of any records
    // In future, this should match student by Airtable record ID
    const hasAnyRecords = attendanceData.size > 0;
    if (mode === 'presence') {
        // For presence mode, having any records means they attended
        return hasAnyRecords;
    }
    else {
        // For absence mode, having NO absence records means they attended
        // This is a simplification - in reality we'd need school calendar data
        return !hasAnyRecords;
    }
}
/**
 * Main sync function
 */
async function syncAirtableData(db, token, targetSchoolYear) {
    const config = await getAirtableConfig(db);
    const errors = [];
    let processed = 0;
    // Get all existing students for cross-year matching
    const existingStudents = new Map();
    const existingCampuses = new Map();
    // First pass: collect all existing data for matching
    for (const base of config.bases) {
        for (const year of base.schoolYears) {
            if (targetSchoolYear && year !== targetSchoolYear)
                continue;
            try {
                const records = await fetchAirtableRecords(base.baseId, base.tables.students.tableIdOrName, token);
                const students = processStudents(records, base, year);
                for (const [key, student] of students) {
                    if (!existingStudents.has(key)) {
                        existingStudents.set(key, new Set());
                    }
                    existingStudents.get(key).add(year);
                    if (student.campusKey) {
                        if (!existingCampuses.has(student.campusKey)) {
                            existingCampuses.set(student.campusKey, new Set());
                        }
                        existingCampuses.get(student.campusKey).add(year);
                    }
                }
            }
            catch (error) {
                errors.push(`Failed to fetch students from ${base.label} for ${year}: ${error.message}`);
            }
        }
    }
    // Second pass: process and save students with matching info
    const studentsRef = db.collection('students');
    const pendingWrites = [];
    for (const base of config.bases) {
        for (const year of base.schoolYears) {
            if (targetSchoolYear && year !== targetSchoolYear)
                continue;
            try {
                console.log(`Processing ${base.label || base.baseId} for ${year}...`);
                // Fetch students
                const studentRecords = await fetchAirtableRecords(base.baseId, base.tables.students.tableIdOrName, token);
                console.log(`  Fetched ${studentRecords.length} student records`);
                const students = processStudents(studentRecords, base, year);
                console.log(`  Processed ${students.size} unique students`);
                // Fetch attendance data if available
                let attendanceData = new Map();
                const attendanceTable = base.attendanceMode === 'absence'
                    ? base.tables.absences
                    : base.tables.attendance;
                if (attendanceTable) {
                    try {
                        const tableConfig = {
                            tableIdOrName: attendanceTable.tableIdOrName,
                            fields: attendanceTable.fields
                        };
                        attendanceData = await getAttendanceData(base.baseId, tableConfig, token, base.attendanceMode);
                        console.log(`  Fetched ${attendanceData.size} attendance records`);
                    }
                    catch (error) {
                        console.error(`  Attendance fetch failed:`, error);
                        errors.push(`Failed to fetch attendance from ${base.label || base.baseId}: ${error.message}`);
                    }
                }
                // Determine prior year for retention matching
                const yearParts = year.split('-').map(p => parseInt(p));
                const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;
                // Process each student
                for (const [key, student] of students) {
                    const studentYears = existingStudents.get(key) || new Set();
                    const campusYears = student.campusKey
                        ? existingCampuses.get(student.campusKey) || new Set()
                        : new Set();
                    // Determine attendance based on mode and data
                    const attended = (0, types_1.isActiveEnrollment)(student.enrollmentStatus || '')
                        ? determineAttendance(key, attendanceData, base.attendanceMode)
                        : false;
                    const fullStudent = {
                        id: `${year}-${key}`,
                        ...student,
                        isReturningStudent: studentYears.has(priorYear),
                        isReturningCampus: campusYears.has(priorYear),
                        attendedAtLeastOnce: attended,
                        syncedAt: new Date().toISOString()
                    };
                    pendingWrites.push({
                        ref: studentsRef.doc(fullStudent.id),
                        data: fullStudent
                    });
                    processed++;
                }
            }
            catch (error) {
                console.error(`  Processing failed:`, error);
                errors.push(`Failed to process ${base.label || base.baseId} for ${year}: ${error.message}`);
            }
        }
    }
    // Commit in batches of 499 (Firestore limit is 500 per batch)
    console.log(`Committing ${pendingWrites.length} student records...`);
    const BATCH_SIZE = 499;
    for (let i = 0; i < pendingWrites.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = pendingWrites.slice(i, i + BATCH_SIZE);
        for (const { ref, data } of chunk) {
            batch.set(ref, data, { merge: true });
        }
        await batch.commit();
        console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} records)`);
    }
    return { processed, errors };
}
//# sourceMappingURL=airtable.js.map