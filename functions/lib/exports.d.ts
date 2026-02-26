import type { Firestore } from 'firebase-admin/firestore';
import { Snapshot, AppSettings } from './types';
/**
 * Generate PDF report matching the narrative template format.
 * Returns the PDF as a base64-encoded string (avoids Storage signed-URL IAM issues).
 */
export declare function generatePDFReport(snapshot: Snapshot, previousSnapshot: Snapshot | null, reportType: 'annual' | 'campus', campusKey: string | undefined, settings: AppSettings): Promise<{
    pdfBase64: string;
    fileName: string;
}>;
/**
 * Generate CSV export
 */
export declare function generateCSVExport(db: Firestore, schoolYear: string, dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline'): Promise<string>;
