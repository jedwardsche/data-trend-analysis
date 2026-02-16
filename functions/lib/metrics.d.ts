import type { Firestore } from 'firebase-admin/firestore';
import { Snapshot, EnrollmentWeek, AppSettings } from './types';
/**
 * Calculate snapshot metrics for a school year
 */
export declare function calculateSnapshot(db: Firestore, schoolYear: string, settings: AppSettings): Promise<Snapshot>;
/**
 * Calculate enrollment timeline (weekly enrollments)
 */
export declare function calculateEnrollmentTimeline(db: Firestore, schoolYear: string): Promise<EnrollmentWeek[]>;
