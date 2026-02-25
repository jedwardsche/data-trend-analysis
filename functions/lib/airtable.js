"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAirtableData = syncAirtableData;
const types_1 = require("./types");
/**
 * Fetch records from Airtable with pagination.
 * Uses cellFormat=string to resolve linked records to display values.
 */
async function fetchAirtableRecords(baseId, tableIdOrName, token) {
    const allRecords = [];
    let offset;
    do {
        const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableIdOrName)}`);
        // cellFormat=string converts linked record IDs to display values
        url.searchParams.set('cellFormat', 'string');
        url.searchParams.set('timeZone', 'America/Denver');
        url.searchParams.set('userLocale', 'en-us');
        if (offset) {
            url.searchParams.set('offset', offset);
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
                                firstName: "Student's Legal First Name (as stated on their birth certificate)",
                                lastName: "Student's Legal Last Name",
                                dob: "Student's Birthdate",
                                enrollmentStatus: 'Status of Enrollment (from Student Truth)',
                                campusName: 'Campus (from Truth) (from Student Truth)',
                                mcLeader: '',
                                created: 'Created',
                                lastModified: 'Last Modified',
                                schoolYear: 'School Year Text'
                            }
                        },
                        absences: {
                            tableIdOrName: 'Absent',
                            fields: {
                                studentLink: 'Student',
                                date: 'Date'
                            }
                        },
                        studentTruth: {
                            tableIdOrName: 'Student Truth',
                            fields: {
                                studentLink: 'Student',
                                dateEnrolled: 'Date Enrolled',
                                enrollmentStatus: 'Status of Enrollment',
                                schoolYear: 'School Year',
                                created: 'Created'
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
                                firstName: "Student's Legal First Name (as stated on their birth certificate)",
                                lastName: "Student's Legal Last Name",
                                dob: "Student's Birthdate",
                                enrollmentStatus: 'Status of Enrollment (from Student Truth)',
                                campusName: 'Campus (from Truth) (from Student Truth)',
                                mcLeader: '',
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
                        },
                        studentTruth: {
                            tableIdOrName: 'Student Truth',
                            fields: {
                                studentLink: 'Student',
                                dateEnrolled: 'Date Enrolled',
                                enrollmentStatus: 'Status of Enrollment',
                                schoolYear: 'School Year',
                                created: 'Created'
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
 * Extract the current (last unique) value from a comma-separated linked record field.
 * Airtable cellFormat=string joins linked record values with ", ".
 * For campus fields, this returns the campus history; we want the most recent.
 */
function getLastUniqueValue(value) {
    if (!value || !value.includes(','))
        return value.trim();
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    // Return the last value (most recent)
    return parts[parts.length - 1] || value.trim();
}
/**
 * Normalize school year string to short format: "2025-26"
 * Handles: "2025-2026", "2025-26", "2025 - 2026", "2025 - 26", "SY 2025-26", etc.
 */
function normalizeSchoolYear(yearStr) {
    const cleaned = yearStr.trim();
    const match = cleaned.match(/(\d{4})\s*[-–—]\s*(\d{2,4})/);
    if (!match)
        return cleaned.toLowerCase();
    const start = match[1];
    const end = match[2].length === 4 ? match[2].slice(2) : match[2];
    return `${start}-${end}`;
}
/**
 * Extract ALL school years from a field value that may contain multiple years.
 * Handles comma-separated lists like "2023-2024, 2024-2025, 2025-2026"
 * and single values like "2025-2026: 2025-08-01-2026-06-12"
 */
function extractSchoolYears(yearStr) {
    if (!yearStr)
        return [];
    // Split by comma first (handles "2023-2024, 2024-2025, 2025-2026")
    const parts = yearStr.split(',').map(s => s.trim()).filter(Boolean);
    const years = [];
    for (const part of parts) {
        const normalized = normalizeSchoolYear(part);
        if (normalized && /^\d{4}-\d{2}$/.test(normalized)) {
            years.push(normalized);
        }
    }
    // Deduplicate
    return [...new Set(years)];
}
/**
 * Process students from Airtable records into StudentRecord partials
 */
function processStudents(records, baseConfig, targetYear, studentTruthLookup) {
    const students = new Map();
    const fields = baseConfig.tables.students.fields;
    let skippedCount = 0;
    for (const record of records) {
        try {
            const firstName = getFieldValue(record, fields.firstName);
            const lastName = getFieldValue(record, fields.lastName);
            const dob = getFieldValue(record, fields.dob);
            if (!firstName || !lastName || !dob) {
                skippedCount++;
                continue;
            }
            const studentKey = (0, types_1.createStudentKey)(firstName, lastName, dob);
            // Campus field may contain history (comma-separated); take most recent
            const rawCampus = getFieldValue(record, fields.campusName);
            const campus = getLastUniqueValue(rawCampus);
            const mcLeader = fields.mcLeader ? getFieldValue(record, fields.mcLeader) : '';
            const rawStatus = getFieldValue(record, fields.enrollmentStatus);
            const enrollmentStatus = getLastUniqueValue(rawStatus);
            // Look up year-specific Date Enrolled + Status from Student Truth table
            let enrollmentDate = '';
            let truthStatus = '';
            if (studentTruthLookup && studentTruthLookup.size > 0) {
                const displayName = `${firstName} ${lastName}`;
                const lookupKey = `${(0, types_1.normalizeString)(displayName)}|${targetYear}`;
                const truthData = studentTruthLookup.get(lookupKey);
                if (truthData) {
                    enrollmentDate = truthData.date;
                    truthStatus = truthData.status;
                }
            }
            // Fallback: Students table "Enrollment Date" → record createdTime
            if (!enrollmentDate) {
                enrollmentDate = getFieldValue(record, 'Enrollment Date') ||
                    (record.createdTime ? record.createdTime : '');
            }
            // Use Student Truth enrollment status as fallback when Students table status is empty
            // This is critical for older years (e.g. 23-24) where Students table status is often blank
            // but Student Truth has the accurate per-year status (matching Python's direct query approach)
            const finalEnrollmentStatus = enrollmentStatus || truthStatus;
            students.set(studentKey, {
                studentKey,
                firstName,
                lastName,
                dob: (0, types_1.formatDate)(dob),
                schoolYear: targetYear,
                campus,
                mcLeader,
                campusKey: campus ? (0, types_1.createCampusKey)(campus, mcLeader) : '',
                enrollmentStatus: finalEnrollmentStatus,
                enrolledDate: (0, types_1.formatDate)(enrollmentDate),
                isVerifiedTransfer: false,
                isGraduate: false,
                withdrawalDate: null
            });
        }
        catch (err) {
            skippedCount++;
        }
    }
    if (skippedCount > 0) {
        console.log(`  Skipped ${skippedCount} records (missing name/dob or parse error)`);
    }
    return students;
}
/**
 * Main sync function
 */
async function syncAirtableData(db, token, targetSchoolYear) {
    const config = await getAirtableConfig(db);
    const errors = [];
    let processed = 0;
    // When syncing a specific year, also load its prior year for isReturningStudent lookup.
    // The prior year may live in a different Airtable base.
    let priorYearForLookup;
    if (targetSchoolYear) {
        const parts = targetSchoolYear.split('-').map(p => parseInt(p));
        priorYearForLookup = `${parts[0] - 1}-${parts[1] - 1}`;
    }
    // Collect all student data across years for cross-year matching
    const allStudentsByYear = new Map();
    const allCampusesByYear = new Map();
    // Process each base
    for (const base of config.bases) {
        try {
            console.log(`Fetching all records from ${base.label || base.baseId}...`);
            // Fetch ALL records from this base once (cellFormat=string resolves linked records)
            const records = await fetchAirtableRecords(base.baseId, base.tables.students.tableIdOrName, token);
            console.log(`  Fetched ${records.length} total student records`);
            // Fetch Student Truth records for year-specific enrollment dates + statuses
            // key: "normalizedName|year" → { date, status }
            const studentTruthLookup = new Map();
            if (base.tables.studentTruth) {
                console.log(`  Fetching Student Truth records from ${base.label}...`);
                const truthRecords = await fetchAirtableRecords(base.baseId, base.tables.studentTruth.tableIdOrName, token);
                console.log(`  Fetched ${truthRecords.length} Student Truth records`);
                const truthFields = base.tables.studentTruth.fields;
                // Log sample records for diagnostics
                if (truthRecords.length > 0) {
                    console.log('  Sample Student Truth records:');
                    truthRecords.slice(0, 5).forEach((r, i) => {
                        const name = getFieldValue(r, truthFields.studentLink);
                        const year = getFieldValue(r, truthFields.schoolYear);
                        const date = getFieldValue(r, truthFields.dateEnrolled);
                        const created = getFieldValue(r, truthFields.created);
                        console.log(`    [${i}] Student="${name}", Year="${year}", DateEnrolled="${date}", Created="${created}"`);
                    });
                }
                for (const record of truthRecords) {
                    const rawStudentName = getFieldValue(record, truthFields.studentLink);
                    const rawYear = getFieldValue(record, truthFields.schoolYear);
                    const dateEnrolled = getFieldValue(record, truthFields.dateEnrolled);
                    const created = getFieldValue(record, truthFields.created);
                    const status = getFieldValue(record, truthFields.enrollmentStatus);
                    if (!rawStudentName || !rawYear)
                        continue;
                    // Student Truth "Student" linked field returns "Last, First" format (may have extra quotes)
                    // Normalize to "first last" to match Students table firstName + lastName
                    const cleanName = rawStudentName.replace(/^"+|"+$/g, '').trim(); // strip surrounding quotes
                    const nameParts = cleanName.split(',').map(s => s.trim());
                    const normalizedName = nameParts.length >= 2
                        ? (0, types_1.normalizeString)(`${nameParts[1]} ${nameParts[0]}`) // "First Last"
                        : (0, types_1.normalizeString)(cleanName);
                    const years = extractSchoolYears(rawYear);
                    for (const year of years) {
                        const lookupKey = `${normalizedName}|${year}`;
                        // Determine effective date per reference doc logic:
                        // - For 2024-25 "Enrolled" status: use Created if Date Enrolled missing
                        // - Otherwise: Date Enrolled, fallback to Created
                        let effectiveDate = dateEnrolled;
                        if (!effectiveDate && year === '2024-25' && status === 'Enrolled') {
                            effectiveDate = created;
                        }
                        if (!effectiveDate) {
                            effectiveDate = created || record.createdTime || '';
                        }
                        if (effectiveDate) {
                            studentTruthLookup.set(lookupKey, { date: effectiveDate, status: status || '' });
                        }
                    }
                }
                console.log(`  Built Student Truth lookup with ${studentTruthLookup.size} entries`);
            }
            // Log field diagnostics
            if (records.length > 0) {
                console.log(`  Available fields: ${Object.keys(records[0].fields).join(', ')}`);
                const fields = base.tables.students.fields;
                const yearField = fields.schoolYear || 'School Year';
                const sampleValues = records.slice(0, 10).map(r => {
                    const v = r.fields[yearField];
                    return JSON.stringify(v);
                });
                console.log(`  Sample '${yearField}' values: ${sampleValues.join(', ')}`);
            }
            // Group records by school year
            const fields = base.tables.students.fields;
            const yearField = fields.schoolYear || 'School Year';
            const recordsByYear = new Map();
            let unmatchedCount = 0;
            for (const record of records) {
                const rawYear = getFieldValue(record, yearField);
                if (!rawYear) {
                    unmatchedCount++;
                    continue;
                }
                const years = extractSchoolYears(rawYear);
                if (years.length === 0) {
                    unmatchedCount++;
                    continue;
                }
                // Assign record to ALL its years
                for (const year of years) {
                    if (!recordsByYear.has(year)) {
                        recordsByYear.set(year, []);
                    }
                    recordsByYear.get(year).push(record);
                }
            }
            console.log(`  Year groups found: ${Array.from(recordsByYear.entries()).map(([y, r]) => `${y} (${r.length})`).join(', ')}`);
            if (unmatchedCount > 0) {
                console.log(`  Records with no School Year: ${unmatchedCount}`);
            }
            // Process each year this base covers.
            // When a targetSchoolYear is set, always also process its prior year (for the
            // isReturningStudent cross-year lookup), even if that year lives in a different base.
            for (const year of base.schoolYears) {
                const isTargetYear = !targetSchoolYear || year === targetSchoolYear;
                const isPriorLookupYear = priorYearForLookup && year === priorYearForLookup;
                if (!isTargetYear && !isPriorLookupYear)
                    continue;
                const yearRecords = recordsByYear.get(year);
                if (!yearRecords || yearRecords.length === 0) {
                    console.log(`  No records matched year ${year}`);
                    // If no records matched, check if all records have no year and this is a single-year base
                    if (base.schoolYears.length === 1 && recordsByYear.size === 0) {
                        console.log(`  Single-year base with no year field data - assigning all ${records.length} records to ${year}`);
                        const students = processStudents(records, base, year, studentTruthLookup);
                        console.log(`  Processed ${students.size} unique students for ${year}`);
                        allStudentsByYear.set(year, students);
                        const campuses = new Set();
                        for (const s of students.values())
                            if (s.campusKey)
                                campuses.add(s.campusKey);
                        allCampusesByYear.set(year, campuses);
                    }
                    continue;
                }
                console.log(`  Processing ${yearRecords.length} records for ${year}...`);
                const students = processStudents(yearRecords, base, year, studentTruthLookup);
                console.log(`  Processed ${students.size} unique students for ${year}`);
                // Merge with existing (in case multiple bases contribute to the same year)
                const existing = allStudentsByYear.get(year) || new Map();
                for (const [key, student] of students) {
                    existing.set(key, student);
                }
                allStudentsByYear.set(year, existing);
                const campuses = allCampusesByYear.get(year) || new Set();
                for (const s of students.values())
                    if (s.campusKey)
                        campuses.add(s.campusKey);
                allCampusesByYear.set(year, campuses);
            }
        }
        catch (error) {
            console.error(`  Failed:`, error);
            errors.push(`Failed to fetch from ${base.label || base.baseId}: ${error.message}`);
        }
    }
    // If year filtering produced nothing and we have multi-year bases, try assigning all
    const totalFetched = Array.from(allStudentsByYear.values()).reduce((sum, m) => sum + m.size, 0);
    if (totalFetched === 0) {
        console.log('WARNING: No students matched any year. The School Year field values may not match expected formats.');
        console.log('Falling back to assigning all records from each base to all configured years...');
        for (const base of config.bases) {
            try {
                const records = await fetchAirtableRecords(base.baseId, base.tables.students.tableIdOrName, token);
                for (const year of base.schoolYears) {
                    if (targetSchoolYear && year !== targetSchoolYear)
                        continue;
                    const students = processStudents(records, base, year);
                    console.log(`  Fallback: assigned ${students.size} students to ${year} from ${base.label}`);
                    const existing = allStudentsByYear.get(year) || new Map();
                    for (const [key, student] of students) {
                        existing.set(key, student);
                    }
                    allStudentsByYear.set(year, existing);
                    const campuses = allCampusesByYear.get(year) || new Set();
                    for (const s of students.values())
                        if (s.campusKey)
                            campuses.add(s.campusKey);
                    allCampusesByYear.set(year, campuses);
                }
            }
            catch (error) {
                console.error(`  Fallback failed:`, error);
                errors.push(`Fallback fetch from ${base.label || base.baseId}: ${error.message}`);
            }
        }
    }
    // Build cross-year lookups for isReturningStudent and isReturningCampus.
    // Only count a student/campus as "present in year X" if they had an ACTIVE enrollment status
    // that year — this ensures retention rates stay within 0–100%.
    const studentYearLookup = new Map();
    const campusYearLookup = new Map();
    for (const [year, students] of allStudentsByYear) {
        for (const [key, student] of students) {
            // Only include students with an active enrollment status in this year
            if (!(0, types_1.isActiveEnrollment)(student.enrollmentStatus || ''))
                continue;
            if (!studentYearLookup.has(key))
                studentYearLookup.set(key, new Set());
            studentYearLookup.get(key).add(year);
            if (student.campusKey) {
                if (!campusYearLookup.has(student.campusKey))
                    campusYearLookup.set(student.campusKey, new Set());
                campusYearLookup.get(student.campusKey).add(year);
            }
        }
    }
    // Save to Firestore
    const studentsRef = db.collection('students');
    const pendingWrites = [];
    for (const [year, students] of allStudentsByYear) {
        // Skip the prior-year lookup data — it was only loaded to populate studentYearLookup,
        // not to be (re)written to Firestore.
        if (priorYearForLookup && year === priorYearForLookup)
            continue;
        const yearParts = year.split('-').map(p => parseInt(p));
        const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;
        for (const [key, student] of students) {
            const studentYears = studentYearLookup.get(key) || new Set();
            const campusYears = student.campusKey
                ? campusYearLookup.get(student.campusKey) || new Set()
                : new Set();
            // Sanitize document ID: replace forward slashes to prevent subcollection creation
            const docId = `${year}-${key}`.replace(/\//g, '-');
            // Derive attrition flags from enrollment status
            const status = student.enrollmentStatus || '';
            const isNonStarter = (0, types_1.isNonStarterStatus)(status);
            const isWithdrawal = (0, types_1.isWithdrawalStatus)(status);
            // attendedAtLeastOnce: false for non-starters, true for everyone else
            const attendedAtLeastOnce = !isNonStarter;
            // withdrawalDate: use enrolled date as proxy for withdrawal students
            // (exact withdrawal date not available from Airtable)
            const withdrawalDate = isWithdrawal ? (student.enrolledDate || new Date().toISOString().split('T')[0]) : null;
            const fullStudent = {
                id: docId,
                ...student,
                isReturningStudent: studentYears.has(priorYear),
                isReturningCampus: campusYears.has(priorYear),
                attendedAtLeastOnce,
                withdrawalDate,
                syncedAt: new Date().toISOString()
            };
            pendingWrites.push({
                ref: studentsRef.doc(docId),
                data: fullStudent
            });
            processed++;
        }
    }
    // Log sample document IDs to check for path issues (e.g., slashes)
    const sampleIds = pendingWrites.slice(0, 5).map(w => w.data.id);
    console.log(`Sample document IDs: ${JSON.stringify(sampleIds)}`);
    // Check for forward slashes in document IDs (would create subcollections!)
    const slashIds = pendingWrites.filter(w => w.data.id.includes('/'));
    if (slashIds.length > 0) {
        console.log(`WARNING: ${slashIds.length} document IDs contain forward slashes!`);
        console.log(`  Examples: ${slashIds.slice(0, 3).map(w => w.data.id).join(', ')}`);
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
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.log(`  Committed batch ${batchNum} (${chunk.length} records)`);
        // Verify first document of first batch persisted
        if (i === 0) {
            const firstRef = chunk[0].ref;
            const readBack = await firstRef.get();
            console.log(`  [VERIFY] First doc ${firstRef.id} exists: ${readBack.exists}`);
            if (readBack.exists) {
                console.log(`  [VERIFY] schoolYear: ${readBack.data()?.schoolYear}, campus: ${readBack.data()?.campus?.substring(0, 30)}`);
            }
        }
    }
    // Verify documents by school year
    console.log('Verifying student documents in Firestore...');
    const allYears = [...new Set(pendingWrites.map(w => w.data.schoolYear))];
    for (const year of allYears) {
        const yearCount = await db.collection('students')
            .where('schoolYear', '==', year)
            .count().get();
        console.log(`  [VERIFY] Students for ${year}: ${yearCount.data().count}`);
    }
    // Count total
    const totalCount = await db.collection('students').count().get();
    console.log(`  [VERIFY] Total students in Firestore: ${totalCount.data().count}`);
    console.log(`Sync complete: ${processed} records, ${errors.length} errors`);
    return { processed, errors };
}
//# sourceMappingURL=airtable.js.map