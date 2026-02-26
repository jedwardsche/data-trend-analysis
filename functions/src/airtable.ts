import type { Firestore } from 'firebase-admin/firestore';
import type { firestore as FirebaseFirestore } from 'firebase-admin';
import {
  AirtableConfig,
  AirtableBaseConfig,
  StudentRecord,
  StudentTruthFieldMapping,
  createStudentKey,
  createCampusKey,
  formatDate,
  isActiveEnrollment,
  isNonStarterStatus,
  isWithdrawalStatus,
  normalizeString
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
            },
            studentTruth: {
              tableIdOrName: 'Student Truth',
              fields: {
                studentLink: 'Student',
                dateEnrolled: 'Date Enrolled',
                enrollmentStatus: 'Status of Enrollment',
                schoolYear: 'School Year',
                created: 'Created',
                mcLeader: 'Staff (From Truth)',
                campusFromTruth: 'Campus (from Truth)',
                s1TotalPresentDays: 'S1 Total Present Days',
                s2TotalPresentDays: 'S2 Total Present Days',
                s1PossiblePresentDays: 'S1 Number of Possible Present Days',
                s2PossiblePresentDays: 'S2 Number of Possible Present Days'
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
                created: 'Created',
                mcLeader: 'Staff (from Truth)',
                campusFromTruth: 'Campus (from Truth)',
                s1TotalPresentDays: 'S1 Total Present Days',
                s2TotalPresentDays: 'S2 Total Present Days',
                s1PossiblePresentDays: 'S1 Number of Possible Present Days',
                s2PossiblePresentDays: 'S2 Number of Possible Present Days'
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
interface TruthLookupEntry {
  date: string;
  status: string;
  mcLeader: string;
  truthCampus: string;
  s1PresentDays: number;
  s2PresentDays: number;
  s1PossibleDays: number;
  s2PossibleDays: number;
}

function processStudents(
  records: AirtableRecord[],
  baseConfig: AirtableBaseConfig,
  targetYear: string,
  studentTruthLookup?: Map<string, TruthLookupEntry>
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

      // Look up year-specific Date Enrolled + Status + MC Leader + Campus from Student Truth table
      let enrollmentDate = '';
      let truthStatus = '';
      let truthMcLeader = '';
      let truthCampus = '';
      if (studentTruthLookup && studentTruthLookup.size > 0) {
        const displayName = `${firstName} ${lastName}`;
        const lookupKey = `${normalizeString(displayName).replace(/\s+/g, ' ')}|${targetYear}`;
        const truthData = studentTruthLookup.get(lookupKey);
        if (truthData) {
          enrollmentDate = truthData.date;
          truthStatus = truthData.status;
          truthMcLeader = truthData.mcLeader;
          truthCampus = truthData.truthCampus;
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

      // Use the truth campus (year-specific) to determine the ACTUAL campus.
      // The Students table campus field shows ALL campuses from ALL years (linked record history),
      // so the truth campus is more accurate for the target year.
      // If truth campus is a named campus (not "Micro-Campus"), use it — the student belongs to
      // that branch campus, NOT a micro-campus, even if the Students table says "Micro-Campus".
      const effectiveCampus = truthCampus || campus;
      const isMicroCampus = effectiveCampus.toLowerCase().includes('micro');

      // Only apply mcLeader for Micro-Campus students — branch campus students should NOT be split
      const finalMcLeader = isMicroCampus ? (mcLeader || truthMcLeader) : mcLeader;

      students.set(studentKey, {
        studentKey,
        firstName,
        lastName,
        dob: formatDate(dob),
        schoolYear: targetYear,
        campus: effectiveCampus,
        mcLeader: finalMcLeader,
        campusKey: effectiveCampus ? createCampusKey(effectiveCampus, finalMcLeader) : '',
        enrollmentStatus: finalEnrollmentStatus,
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

  // --- Multi-name mcLeader consolidation ---
  // Some truth records have comma-separated staff names like
  // "Kristi Kirkpatrick, Karlie Kirkpatrick, Jennifer Sirbu".
  // These should be consolidated to the primary single-name leader.
  // Step 1: Collect all single-name micro-campus leaders
  const singleNameLeaders = new Set<string>();
  for (const student of students.values()) {
    if (student.mcLeader && !student.mcLeader.includes(',') &&
        student.campus?.toLowerCase().includes('micro')) {
      singleNameLeaders.add(normalizeString(student.mcLeader));
    }
  }

  // Step 2: For students with multi-name mcLeaders, find a matching single-name leader
  let consolidatedCount = 0;
  for (const [key, student] of students) {
    if (!student.mcLeader || !student.mcLeader.includes(',')) continue;
    if (!student.campus?.toLowerCase().includes('micro')) continue;

    const names = student.mcLeader.split(',').map(n => n.trim()).filter(Boolean);
    let matchedLeader = '';

    // Check if any individual name matches a known single-name leader
    for (const name of names) {
      if (singleNameLeaders.has(normalizeString(name))) {
        matchedLeader = name;
        break;
      }
    }

    // If no match found, use the first name
    if (!matchedLeader) {
      matchedLeader = names[0];
    }

    // Update student record with consolidated leader
    student.mcLeader = matchedLeader;
    student.campusKey = student.campus
      ? createCampusKey(student.campus, matchedLeader)
      : '';
    students.set(key, student);
    consolidatedCount++;
  }

  if (consolidatedCount > 0) {
    console.log(`  Consolidated ${consolidatedCount} multi-name mcLeader records`);
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

  // When syncing a specific year, also load its prior year for isReturningStudent lookup.
  // The prior year may live in a different Airtable base.
  let priorYearForLookup: string | undefined;
  if (targetSchoolYear) {
    const parts = targetSchoolYear.split('-').map(p => parseInt(p));
    priorYearForLookup = `${parts[0] - 1}-${parts[1] - 1}`;
  }

  // Collect all student data across years for cross-year matching
  const allStudentsByYear = new Map<string, Map<string, Partial<StudentRecord>>>();
  const allCampusesByYear = new Map<string, Set<string>>();

  // Store Student Truth attendance lookups per year for non-starter detection
  const studentTruthLookups = new Map<string, Map<string, TruthLookupEntry>>();

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

      // Fetch Student Truth records for year-specific enrollment dates, statuses, and attendance
      // key: "normalizedName|year" → { date, status, attendance data }
      const studentTruthLookup = new Map<string, TruthLookupEntry>();
      if (base.tables.studentTruth) {
        console.log(`  Fetching Student Truth records from ${base.label}...`);
        const truthRecords = await fetchAirtableRecords(
          base.baseId,
          base.tables.studentTruth.tableIdOrName,
          token
        );
        console.log(`  Fetched ${truthRecords.length} Student Truth records`);

        const truthFields = base.tables.studentTruth.fields as unknown as StudentTruthFieldMapping;

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

        let skippedSandboxCount = 0;
        for (const record of truthRecords) {
          const rawStudentName = getFieldValue(record, truthFields.studentLink);
          const rawYear = getFieldValue(record, truthFields.schoolYear);
          const dateEnrolled = getFieldValue(record, truthFields.dateEnrolled);
          const created = getFieldValue(record, truthFields.created);
          const status = getFieldValue(record, truthFields.enrollmentStatus);
          const truthMcLeader = truthFields.mcLeader
            ? getFieldValue(record, truthFields.mcLeader)
            : '';
          const truthCampus = truthFields.campusFromTruth
            ? getFieldValue(record, truthFields.campusFromTruth)
            : '';

          // Skip Sandbox/Training truth records entirely
          if (truthMcLeader && (
            truthMcLeader.toLowerCase().includes('sandbox') ||
            truthMcLeader.toLowerCase().includes('training')
          )) {
            skippedSandboxCount++;
            continue;
          }

          // Extract attendance rollup fields
          const s1PresentDays = truthFields.s1TotalPresentDays
            ? parseFloat(getFieldValue(record, truthFields.s1TotalPresentDays)) || 0
            : 0;
          const s2PresentDays = truthFields.s2TotalPresentDays
            ? parseFloat(getFieldValue(record, truthFields.s2TotalPresentDays)) || 0
            : 0;
          const s1PossibleDays = truthFields.s1PossiblePresentDays
            ? parseFloat(getFieldValue(record, truthFields.s1PossiblePresentDays)) || 0
            : 0;
          const s2PossibleDays = truthFields.s2PossiblePresentDays
            ? parseFloat(getFieldValue(record, truthFields.s2PossiblePresentDays)) || 0
            : 0;

          if (!rawStudentName || !rawYear) continue;

          // Student Truth "Student" linked field returns "Last, First" format (may have extra quotes)
          // Normalize to "first last" to match Students table firstName + lastName
          const cleanName = rawStudentName.replace(/^"+|"+$/g, '').trim(); // strip surrounding quotes
          const nameParts = cleanName.split(',').map(s => s.trim());
          const normalizedName = nameParts.length >= 2
            ? normalizeString(`${nameParts[1]} ${nameParts[0]}`).replace(/\s+/g, ' ') // "First Last"
            : normalizeString(cleanName).replace(/\s+/g, ' ');

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
              studentTruthLookup.set(lookupKey, {
                date: effectiveDate,
                status: status || '',
                mcLeader: truthMcLeader || '',
                truthCampus: truthCampus || '',
                s1PresentDays,
                s2PresentDays,
                s1PossibleDays,
                s2PossibleDays
              });
            }
          }
        }
        if (skippedSandboxCount > 0) {
          console.log(`  Skipped ${skippedSandboxCount} Sandbox/Training truth records`);
        }
        console.log(`  Built Student Truth lookup with ${studentTruthLookup.size} entries`);

        // Copy truth entries into per-year lookup map for non-starter detection during Firestore write
        for (const [lookupKey, entry] of studentTruthLookup) {
          // lookupKey format: "normalizedname|year"
          const pipeIdx = lookupKey.lastIndexOf('|');
          const yearPart = lookupKey.substring(pipeIdx + 1);
          const nameKey = lookupKey; // keep full key for lookup consistency
          if (!studentTruthLookups.has(yearPart)) {
            studentTruthLookups.set(yearPart, new Map());
          }
          studentTruthLookups.get(yearPart)!.set(nameKey, entry);
        }
      }

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

      // Process each year this base covers.
      // When a targetSchoolYear is set, always also process its prior year (for the
      // isReturningStudent cross-year lookup), even if that year lives in a different base.
      for (const year of base.schoolYears) {
        const isTargetYear = !targetSchoolYear || year === targetSchoolYear;
        const isPriorLookupYear = priorYearForLookup && year === priorYearForLookup;
        if (!isTargetYear && !isPriorLookupYear) continue;

        const yearRecords = recordsByYear.get(year);
        if (!yearRecords || yearRecords.length === 0) {
          console.log(`  No records matched year ${year}`);

          // If no records matched, check if all records have no year and this is a single-year base
          if (base.schoolYears.length === 1 && recordsByYear.size === 0) {
            console.log(`  Single-year base with no year field data - assigning all ${records.length} records to ${year}`);
            const students = processStudents(records, base, year, studentTruthLookup);
            console.log(`  Processed ${students.size} unique students for ${year}`);
            allStudentsByYear.set(year, students);

            const campuses = new Set<string>();
            for (const s of students.values()) if (s.campusKey) campuses.add(s.campusKey);
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

  // Build cross-year lookups for isReturningStudent and isReturningCampus.
  // Only count a student/campus as "present in year X" if they had an ACTIVE enrollment status
  // that year — this ensures retention rates stay within 0–100%.
  const studentYearLookup = new Map<string, Set<string>>();
  const campusYearLookup = new Map<string, Set<string>>();

  for (const [year, students] of allStudentsByYear) {
    for (const [key, student] of students) {
      // Only include students with an active enrollment status in this year
      if (!isActiveEnrollment(student.enrollmentStatus || '')) continue;

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
    // Skip the prior-year lookup data — it was only loaded to populate studentYearLookup,
    // not to be (re)written to Firestore.
    if (priorYearForLookup && year === priorYearForLookup) continue;

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
      const isWithdrawal = isWithdrawalStatus(status);

      // Determine attendedAtLeastOnce from Student Truth attendance rollups.
      // Look up the student's truth entry to check present days vs possible days.
      let attendedAtLeastOnce = true; // default: assume attended unless we have data saying otherwise
      const displayName = `${student.firstName} ${student.lastName}`;
      // Collapse multiple whitespace to single space for consistent lookup key matching
      const truthKey = `${normalizeString(displayName).replace(/\s+/g, ' ')}|${year}`;
      const truthLookupForYear = studentTruthLookups.get(year);

      if (truthLookupForYear) {
        const truthEntry = truthLookupForYear.get(truthKey);
        if (truthEntry) {
          const totalPossible = truthEntry.s1PossibleDays + truthEntry.s2PossibleDays;
          const totalPresent = truthEntry.s1PresentDays + truthEntry.s2PresentDays;
          if (totalPossible > 0 && totalPresent <= 0) {
            // Had classes scheduled but never attended any (negative values = data artifact, treat as 0)
            attendedAtLeastOnce = false;
          } else if (totalPossible <= 0) {
            // No classes scheduled — non-starter if they also have a withdrawal/non-starter status
            if (isNonStarterStatus(status) || isWithdrawal) {
              attendedAtLeastOnce = false;
            }
          }
        } else {
          // No truth entry found — only flag if explicit non-starter status
          if (isNonStarterStatus(status)) {
            attendedAtLeastOnce = false;
          }
        }
      } else {
        // No truth lookup available — fall back to status-based check
        if (isNonStarterStatus(status)) {
          attendedAtLeastOnce = false;
        }
      }

      // withdrawalDate: use enrolled date as proxy for withdrawal students
      // (exact withdrawal date not available from Airtable)
      const withdrawalDate = isWithdrawal ? (student.enrolledDate || new Date().toISOString().split('T')[0]) : null;

      const fullStudent: StudentRecord = {
        id: docId,
        ...student as Omit<StudentRecord, 'id' | 'isReturningStudent' | 'isReturningCampus' | 'attendedAtLeastOnce' | 'syncedAt'>,
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
