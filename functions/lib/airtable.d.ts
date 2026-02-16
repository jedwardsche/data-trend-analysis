import type { Firestore } from 'firebase-admin/firestore';
/**
 * Main sync function
 */
export declare function syncAirtableData(db: Firestore, token: string, targetSchoolYear?: string): Promise<{
    processed: number;
    errors: string[];
}>;
