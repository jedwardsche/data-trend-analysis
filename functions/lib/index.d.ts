import type { GetDashboardDataRequest, GetSnapshotDataRequest, TriggerManualSyncRequest, ExportPDFRequest, ExportCSVRequest, AppSettings } from './types';
/**
 * Nightly sync - runs at 2:00 AM Mountain Time (9:00 AM UTC in winter, 8:00 AM UTC in summer)
 */
export declare const scheduledSync: import("firebase-functions/v2/scheduler").ScheduleFunction;
/**
 * Get dashboard data for a specific view
 */
export declare const getDashboardData: import("firebase-functions/v2/https").CallableFunction<GetDashboardDataRequest, any, unknown>;
/**
 * Get snapshot data for a specific school year
 */
export declare const getSnapshotData: import("firebase-functions/v2/https").CallableFunction<GetSnapshotDataRequest, any, unknown>;
/**
 * Trigger manual sync (admin only)
 */
export declare const triggerManualSync: import("firebase-functions/v2/https").CallableFunction<TriggerManualSyncRequest, any, unknown>;
/**
 * Export PDF report
 */
export declare const exportPDF: import("firebase-functions/v2/https").CallableFunction<ExportPDFRequest, any, unknown>;
/**
 * Export CSV data
 */
export declare const exportCSV: import("firebase-functions/v2/https").CallableFunction<ExportCSVRequest, any, unknown>;
/**
 * Get list of campuses for a school year
 */
export declare const getCampuses: import("firebase-functions/v2/https").CallableFunction<{
    schoolYear: string;
}, any, unknown>;
/**
 * Update app settings (admin only)
 */
export declare const updateSettings: import("firebase-functions/v2/https").CallableFunction<Partial<AppSettings>, any, unknown>;
/**
 * Manage allowed users (admin only)
 */
type ManageUsersRequest = {
    action: 'add' | 'remove' | 'list';
    email?: string;
    isAdmin?: boolean;
};
export declare const manageAllowedUsers: import("firebase-functions/v2/https").CallableFunction<ManageUsersRequest, any, unknown>;
export {};
