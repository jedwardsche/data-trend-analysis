import type { Firestore } from 'firebase-admin/firestore';
import type { firestore as FirebaseFirestore } from 'firebase-admin';
import {
  AirtableConfig,
  AirtableBaseConfig,
  StudentRecord,
  createStudentKey,
  createCampusKey,
  formatDate
} from './types';

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * Fetch records from Airtable with pagination.
 * Uses cellFormat=string to resolve linked records to display values.
 */
async function fetchAirtableRecords(
  baseId: string,
  tableIdOrName: string,
  token: string
): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

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

    const data = await response.json() as AirtableResponse;
    allRecords.push(...data.records);
    offset = data.offset;

  } while (offset);

  return allRecords;
}

/**
 * Get Airtable config from Firestore
 */
async function getAirtableConfig(db: Firestore): Promise<AirtableConfig> {
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
                schoolYear: 'School Year Text'
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

  return configDoc.data() as AirtableConfig;
}

/**
 * Get field value from Airtable record, handling linked records
 */
function getFieldValue(record: AirtableRecord, fieldName: string): string {
  const value = record.fields[fieldName];
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value[0]?.toString() || '';
  return value.toString();
}

/**
 * Extract the current (last unique) value from a comma-separated linked record field.
 * Airtable cellFormat=string joins linked record values with ", ".
 * For campus fields, this returns the campus history; we want the most recent.
 */
function getLastUniqueValue(value: string): string {
  if (!value || !value.includes(',')) return value.trim();
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  // Return the last value (most recent)
  return parts[parts.length - 1] || value.trim();
}

/**
 * Normalize school year string to short format: "2025-26"
 * Handles: "2025-2026", "2025-26", "2025 - 2026", "2025 - 26", "SY 2025-26", etc.
 */
function normalizeSchoolYear(yearStr: string): string {
  const cleaned = yearStr.trim();
  const match = cleaned.match(/(\d{4})\s*[-–—]\s*(\d{2,4})/);
  if (!match) return cleaned.toLowerCase();
  const start = match[1];
  const end = match[2].length === 4 ? match[2].slice(2) : match[2];
  return `${start}-${end}`;
}

/**
 * Extract ALL school years from a field value that may contain multiple years.
 * Handles comma-separated lists like "2023-2024, 2024-2025, 2025-2026"
 * and single values like "2025-2026: 2025-08-01-2026-06-12"
 */
function extractSchoolYears(yearStr: string): string[] {
  if (!yearStr) return [];
  // Split by comma first (handles "2023-2024, 2024-2025, 2025-2026")
  const parts = yearStr.split(',').map(s => s.trim()).filter(Boolean);
  const years: string[] = [];
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
function processStudents(
  records: AirtableRecord[],
  baseConfig: AirtableBaseConfig,
  targetYear: string
): Map<string, Partial<StudentRecord>> {
  const students = new Map<string, Partial<StudentRecord>>();
  const fields = baseConfig.tables.students.fields as unknown as Record<string, string>;

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

      const studentKey = createStudentKey(firstName, lastName, dob);
      // Campus field may contain history (comma-separated); take most recent
      const rawCampus = getFieldValue(record, fields.campusName);
      const campus = getLastUniqueValue(rawCampus);
      const mcLeader = fields.mcLeader ? getFieldValue(record, fields.mcLeader) : '';
      const rawStatus = getFieldValue(record, fields.enrollmentStatus);
      const enrollmentStatus = getLastUniqueValue(rawStatus);

      // Use Enrollment Date field if available, fallback to record createdTime
      const enrollmentDate = getFieldValue(record, 'Enrollment Date') ||
        (record.createdTime ? record.createdTime : '');

      students.set(studentKey, {
        studentKey,
        firstName,
        lastName,
        dob: formatDate(dob),
        schoolYear: targetYear,
        campus,
        mcLeader,
        campusKey: campus ? createCampusKey(campus, mcLeader) : '',
        enrollmentStatus,
        enrolledDate: formatDate(enrollmentDate),
        isVerifiedTransfer: false,
        isGraduate: false,
        withdrawalDate: null
      });
    } catch (err) {
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
export async function syncAirtableData(
  db: Firestore,
  token: string,
  targetSchoolYear?: string
): Promise<{
  processed: number;
  errors: string[];
}> {
  const config = await getAirtableConfig(db);
  const errors: string[] = [];
  let processed = 0;

  // Collect all student data across years for cross-year matching
  const allStudentsByYear = new Map<string, Map<string, Partial<StudentRecord>>>();
  const allCampusesByYear = new Map<string, Set<string>>();

  // Process each base
  for (const base of config.bases) {
    try {
      console.log(`Fetching all records from ${base.label || base.baseId}...`);

      // Fetch ALL records from this base once (cellFormat=string resolves linked records)
      const records = await fetchAirtableRecords(
        base.baseId,
        base.tables.students.tableIdOrName,
        token
      );

      console.log(`  Fetched ${records.length} total student records`);

      // Log field diagnostics
      if (records.length > 0) {
        console.log(`  Available fields: ${Object.keys(records[0].fields).join(', ')}`);
        const fields = base.tables.students.fields as unknown as Record<string, string>;
        const yearField = fields.schoolYear || 'School Year';
        const sampleValues = records.slice(0, 10).map(r => {
          const v = r.fields[yearField];
          return JSON.stringify(v);
        });
        console.log(`  Sample '${yearField}' values: ${sampleValues.join(', ')}`);
      }

      // Group records by school year
      const fields = base.tables.students.fields as unknown as Record<string, string>;
      const yearField = fields.schoolYear || 'School Year';

      const recordsByYear = new Map<string, AirtableRecord[]>();
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
          recordsByYear.get(year)!.push(record);
        }
      }

      console.log(`  Year groups found: ${Array.from(recordsByYear.entries()).map(([y, r]) => `${y} (${r.length})`).join(', ')}`);
      if (unmatchedCount > 0) {
        console.log(`  Records with no School Year: ${unmatchedCount}`);
      }

      // Process each year this base covers
      for (const year of base.schoolYears) {
        if (targetSchoolYear && year !== targetSchoolYear) continue;

        const yearRecords = recordsByYear.get(year);
        if (!yearRecords || yearRecords.length === 0) {
          console.log(`  No records matched year ${year}`);

          // If no records matched, check if all records have no year and this is a single-year base
          if (base.schoolYears.length === 1 && recordsByYear.size === 0) {
            console.log(`  Single-year base with no year field data - assigning all ${records.length} records to ${year}`);
            const students = processStudents(records, base, year);
            console.log(`  Processed ${students.size} unique students for ${year}`);
            allStudentsByYear.set(year, students);

            const campuses = new Set<string>();
            for (const s of students.values()) if (s.campusKey) campuses.add(s.campusKey);
            allCampusesByYear.set(year, campuses);
          }
          continue;
        }

        console.log(`  Processing ${yearRecords.length} records for ${year}...`);
        const students = processStudents(yearRecords, base, year);
        console.log(`  Processed ${students.size} unique students for ${year}`);

        // Merge with existing (in case multiple bases contribute to the same year)
        const existing = allStudentsByYear.get(year) || new Map();
        for (const [key, student] of students) {
          existing.set(key, student);
        }
        allStudentsByYear.set(year, existing);

        const campuses = allCampusesByYear.get(year) || new Set();
        for (const s of students.values()) if (s.campusKey) campuses.add(s.campusKey);
        allCampusesByYear.set(year, campuses);
      }

    } catch (error) {
      console.error(`  Failed:`, error);
      errors.push(`Failed to fetch from ${base.label || base.baseId}: ${(error as Error).message}`);
    }
  }

  // If year filtering produced nothing and we have multi-year bases, try assigning all
  const totalFetched = Array.from(allStudentsByYear.values()).reduce((sum, m) => sum + m.size, 0);
  if (totalFetched === 0) {
    console.log('WARNING: No students matched any year. The School Year field values may not match expected formats.');
    console.log('Falling back to assigning all records from each base to all configured years...');

    for (const base of config.bases) {
      try {
        const records = await fetchAirtableRecords(
          base.baseId,
          base.tables.students.tableIdOrName,
          token
        );

        for (const year of base.schoolYears) {
          if (targetSchoolYear && year !== targetSchoolYear) continue;

          const students = processStudents(records, base, year);
          console.log(`  Fallback: assigned ${students.size} students to ${year} from ${base.label}`);

          const existing = allStudentsByYear.get(year) || new Map();
          for (const [key, student] of students) {
            existing.set(key, student);
          }
          allStudentsByYear.set(year, existing);

          const campuses = allCampusesByYear.get(year) || new Set();
          for (const s of students.values()) if (s.campusKey) campuses.add(s.campusKey);
          allCampusesByYear.set(year, campuses);
        }
      } catch (error) {
        console.error(`  Fallback failed:`, error);
        errors.push(`Fallback fetch from ${base.label || base.baseId}: ${(error as Error).message}`);
      }
    }
  }

  // Build cross-year student and campus lookup
  const studentYearLookup = new Map<string, Set<string>>();
  const campusYearLookup = new Map<string, Set<string>>();

  for (const [year, students] of allStudentsByYear) {
    for (const [key, student] of students) {
      if (!studentYearLookup.has(key)) studentYearLookup.set(key, new Set());
      studentYearLookup.get(key)!.add(year);

      if (student.campusKey) {
        if (!campusYearLookup.has(student.campusKey)) campusYearLookup.set(student.campusKey, new Set());
        campusYearLookup.get(student.campusKey)!.add(year);
      }
    }
  }

  // Save to Firestore
  const studentsRef = db.collection('students');
  const pendingWrites: Array<{ ref: FirebaseFirestore.DocumentReference; data: StudentRecord }> = [];

  for (const [year, students] of allStudentsByYear) {
    const yearParts = year.split('-').map(p => parseInt(p));
    const priorYear = `${yearParts[0] - 1}-${yearParts[1] - 1}`;

    for (const [key, student] of students) {
      const studentYears = studentYearLookup.get(key) || new Set();
      const campusYears = student.campusKey
        ? campusYearLookup.get(student.campusKey) || new Set()
        : new Set();

      // Sanitize document ID: replace forward slashes to prevent subcollection creation
      const docId = `${year}-${key}`.replace(/\//g, '-');

      const fullStudent: StudentRecord = {
        id: docId,
        ...student as Omit<StudentRecord, 'id' | 'isReturningStudent' | 'isReturningCampus' | 'attendedAtLeastOnce' | 'syncedAt'>,
        isReturningStudent: studentYears.has(priorYear),
        isReturningCampus: campusYears.has(priorYear),
        attendedAtLeastOnce: true, // Default to true; refine with attendance data later
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
