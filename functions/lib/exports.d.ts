import type { Firestore } from 'firebase-admin/firestore';
import { Snapshot, AppSettings } from './types';
/**
 * Generate PDF report matching the narrative template format
 */
export declare function generatePDFReport(snapshot: Snapshot, previousSnapshot: Snapshot | null, reportType: 'annual' | 'campus', campusKey: string | undefined, settings: AppSettings): Promise<string>;
/**
 * Generate CSV export
 */
export declare function generateCSVExport(db: Firestore, schoolYear: string, dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline'): Promise<string>;
