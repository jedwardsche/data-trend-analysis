import type { Firestore } from 'firebase-admin/firestore';
import type { StudentRecord } from './types';
import { isActiveEnrollment, isExcludedCampus } from './types';
import { CO_ZIP_COORDS } from './data/co-zip-coords';

export interface DemographicBreakdown {
  category: string;
  count: number;
  percent: number;
}

export interface ZipCodePoint {
  zipCode: string;
  lat: number;
  lng: number;
  count: number;
}

export interface CityCount {
  city: string;
  count: number;
}

export interface DemographicsData {
  totalStudents: number;
  gender: DemographicBreakdown[];
  race: DemographicBreakdown[];
  ethnicity: DemographicBreakdown[];
  primaryLanguage: DemographicBreakdown[];
  gradeLevel: DemographicBreakdown[];
  priorEducationalSetting: DemographicBreakdown[];
  isMilitary: DemographicBreakdown[];
  isHomeless: DemographicBreakdown[];
  isImmigrant: DemographicBreakdown[];
  exitDestination: DemographicBreakdown[];
  zipCodePoints: ZipCodePoint[];
  cityBreakdown: CityCount[];
}

/**
 * Normalize a category value: strip leading symbols, trim whitespace, convert to Title Case.
 * e.g. "~ 3rd Grade" → "3rd Grade", "english" → "English"
 */
function normalizeCategory(value: string): string {
  const cleaned = value.trim().replace(/^[^a-zA-Z0-9]+/, '').trim();
  return cleaned.replace(/\w\S*/g, word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

/**
 * Preserve raw Airtable/CDE label: only trim whitespace.
 */
function preserveCategory(value: string): string {
  return value.trim();
}

/**
 * Split a multi-value string into unique individual categories.
 * Handles separators: "/", ", " (comma-space), and " - " (space-dash-space).
 * Deduplicates results so "8th Grade - 8th Grade - 8th Grade" → ["8th Grade"].
 * e.g. "Portuguese/Russian"  → ["Portuguese", "Russian"]
 *      "White, Asian"        → ["White", "Asian"]
 *      "7th Grade - 8th Grade" → ["7th Grade", "8th Grade"]
 */
function splitMultiValue(value: string): string[] {
  // Split on " - ", "/", or ", "
  const parts = value.split(/\s+-\s+|\/|,\s+/).map(s => s.trim()).filter(Boolean);
  // Deduplicate (case-insensitive) while preserving first occurrence's casing
  const seen = new Map<string, string>();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, part);
    }
  }
  return [...seen.values()];
}

/**
 * Clean up coded Airtable values like "0 - No" → "No", "1 - Yes" → "Yes".
 * Strips leading digit + separator patterns (e.g. "0 - ", "1- ").
 */
function cleanCodedValue(value: string): string {
  return value.replace(/^\d+\s*-\s*/, '');
}

/**
 * Normalize free-text exit destination notes into standard categories.
 * Handles both structured dropdown values (Base 1) and free-text parent notes (Base 2).
 */
function normalizeExitDestination(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (!lower) return '';

  // Already-structured dropdown values from Base 1 — pass through with title case
  const structuredValues = [
    'public school', 'private school', 'charter school', 'homeschool',
    'home school', 'moved', 'graduated', 'other', 'unknown'
  ];
  for (const sv of structuredValues) {
    if (lower === sv || lower.startsWith(sv)) {
      if (lower.includes('home') && lower.includes('school')) return 'Homeschool';
      if (lower.includes('public')) return 'Public School';
      if (lower.includes('private')) return 'Private School';
      if (lower.includes('charter')) return 'Charter School';
      if (lower.includes('moved')) return 'Moved';
      if (lower.includes('graduat')) return 'Graduated';
      if (lower === 'other') return 'Other';
      if (lower === 'unknown') return 'Unknown';
    }
  }

  // Parse free-text notes from Base 2 (unEnrollbyParentNote)
  if (lower.includes('public school') || lower.includes('public district') || /\bps\b/.test(lower) || lower.includes('district school')) return 'Public School';
  if (lower.includes('private school') || lower.includes('private christian') || lower.includes('private academy')) return 'Private School';
  if (lower.includes('charter school') || lower.includes('charter')) return 'Charter School';
  if (lower.includes('homeschool') || lower.includes('home school') || lower.includes('home-school') || lower.includes('schooling at home') || lower.includes('educating at home')) return 'Homeschool';
  if (lower.includes('moved') || lower.includes('moving') || lower.includes('relocation') || lower.includes('relocating') || lower.includes('out of state') || lower.includes('out-of-state')) return 'Moved';
  if (lower.includes('graduat')) return 'Graduated';

  // If it's a very short note that doesn't match patterns, classify as "Other"
  // If it's a longer note with no clear destination, also "Other"
  return 'Other';
}

/** Explicit label mappings for homeless status field */
const HOMELESS_LABELS: Record<string, string> = {
  '0 - No': 'Not Homeless',
  'Yes, and is in the physical custody of a parent or guardian': 'Homeless - In Physical Custody',
  'Yes, and is not in the physical custody of a parent or guardian (unaccompanied youth)': 'Homeless - Unaccompanied Youth',
};

/**
 * Aggregate a field into category counts with percentages.
 * Percentages are based on total students so they always sum to 100%.
 * Students with missing data are grouped as "Not Reported".
 *
 * When splitMultiValues is true, values like "Portuguese/Russian" are split
 * and counted under each individual category. A student with a multi-value
 * entry counts once toward each sub-category.
 *
 * When cleanCodedValues is true, strips leading "0 - " / "1 - " prefixes
 * from Airtable coded fields (e.g. "0 - No" → "No").
 *
 * When labelMap is provided, raw values are mapped to display labels.
 * Unmatched values fall back to cleanCodedValues or normalizeCategory.
 */
function aggregateField(
  students: StudentRecord[],
  fieldGetter: (s: StudentRecord) => string | undefined,
  splitMultiValues = false,
  cleanCodedValues = false,
  labelMap?: Record<string, string>,
  preserveRaw = false
): DemographicBreakdown[] {
  const total = students.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();
  let missingCount = 0;

  for (const student of students) {
    const raw = fieldGetter(student)?.trim();
    if (!raw) {
      missingCount++;
      continue;
    }

    // Apply label map first, then fall back to coded value cleaning
    const mapped = labelMap?.[raw];
    const cleaned = mapped ?? (cleanCodedValues ? cleanCodedValue(raw) : raw);
    const categories = splitMultiValues ? splitMultiValue(cleaned) : [cleaned];
    for (const cat of categories) {
      const label = preserveRaw ? preserveCategory(cat) : normalizeCategory(cat);
      if (!label) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  const result = Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 1000) / 10
    }))
    .sort((a, b) => b.count - a.count);

  if (missingCount > 0) {
    result.push({
      category: 'Not Reported',
      count: missingCount,
      percent: Math.round((missingCount / total) * 1000) / 10
    });
  }

  return result;
}

/**
 * Aggregate zip codes into geographic points with lat/lng
 */
function aggregateZipCodes(students: StudentRecord[]): ZipCodePoint[] {
  const zipCounts = new Map<string, number>();

  for (const student of students) {
    const zip = student.zipCode?.trim();
    if (!zip) continue;
    // Normalize to 5-digit zip
    const zip5 = zip.substring(0, 5);
    if (!/^\d{5}$/.test(zip5)) continue;
    zipCounts.set(zip5, (zipCounts.get(zip5) || 0) + 1);
  }

  const points: ZipCodePoint[] = [];
  for (const [zipCode, count] of zipCounts) {
    const coords = CO_ZIP_COORDS[zipCode];
    if (coords) {
      points.push({ zipCode, lat: coords.lat, lng: coords.lng, count });
    }
  }

  return points.sort((a, b) => b.count - a.count);
}

/**
 * Aggregate students by city, sorted by count descending.
 */
function aggregateCities(students: StudentRecord[]): CityCount[] {
  const counts = new Map<string, number>();

  for (const student of students) {
    const city = student.city?.trim();
    if (!city) continue;
    // Title case normalize
    const normalized = city.replace(/\w\S*/g, w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get demographics data for a school year.
 * Queries the students collection and returns aggregated counts only (no PII).
 */
export async function getDemographicsData(
  db: Firestore,
  schoolYear: string
): Promise<DemographicsData> {
  // Query all students for this school year
  const snapshot = await db.collection('students')
    .where('schoolYear', '==', schoolYear)
    .get();

  const allStudents = snapshot.docs.map(doc => doc.data() as StudentRecord)
    .filter(s => !isExcludedCampus(s.campus, s.mcLeader));

  // Filter to active enrollment (exclude non-starters) for most demographics
  const students = allStudents.filter(s => isActiveEnrollment(s.enrollmentStatus || ''));

  const totalStudents = students.length;

  // Exit destination: aggregate across students who have this field populated.
  // For 2025-26 specifically, only include students with unenrolled status because
  // the exit destination field was incorrectly defaulted for many active students.
  const exitDestination = aggregateExitDestination(allStudents, schoolYear);

  return {
    totalStudents,
    gender: aggregateField(students, s => s.gender, false, false, undefined, true),
    race: aggregateField(students, s => s.race, true, false, undefined, true),
    ethnicity: aggregateField(students, s => s.ethnicity, false, false, undefined, true),
    primaryLanguage: aggregateField(students, s => s.primaryLanguage, true, false, undefined, true),
    gradeLevel: aggregateField(students, s => s.gradeLevel, true),
    priorEducationalSetting: aggregateField(students, s => s.priorEducationalSetting, false, false, undefined, true),
    isMilitary: aggregateField(students, s => s.isMilitary, false, true, undefined, true),
    isHomeless: aggregateField(students, s => s.isHomeless, false, true, HOMELESS_LABELS, true),
    isImmigrant: aggregateField(students, s => s.isImmigrant, false, true),
    exitDestination,
    zipCodePoints: aggregateZipCodes(students),
    cityBreakdown: aggregateCities(students),
  };
}

/**
 * Aggregate exit destination data across all students who have the field populated.
 * Normalizes free-text notes and structured dropdown values into standard categories.
 * Percentages are based on total students with a value (not all students).
 */
function aggregateExitDestination(students: StudentRecord[], schoolYear: string): DemographicBreakdown[] {
  const counts = new Map<string, number>();
  let total = 0;

  for (const student of students) {
    // For 2025-26 and 2026-27, exit destination was incorrectly defaulted for many active students.
    // Only count students who actually unenrolled.
    if (schoolYear === '2025-26' || schoolYear === '2026-27') {
      const status = student.enrollmentStatus || '';
      if (status !== 'Unenrolled' && status !== 'Unenrolled After Count Day') continue;
    }

    const raw = student.exitDestination?.trim();
    if (!raw) continue;

    const category = normalizeExitDestination(raw);
    if (!category) continue;

    total++;
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  if (total === 0) return [];

  return Array.from(counts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 1000) / 10
    }))
    .sort((a, b) => b.count - a.count);
}
