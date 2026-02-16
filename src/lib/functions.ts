import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  Snapshot,
  EnrollmentWeek,
  AppSettings,
  CampusMetrics,
  SnapshotMetrics,
  AllowedUser
} from '@/types';

// Dashboard data
interface GetDashboardDataRequest {
  schoolYear: string;
  view: 'overview' | 'campus' | 'yoy' | 'timeline';
  campusKey?: string;
}

interface OverviewResponse {
  snapshot: Snapshot | null;
  settings: AppSettings;
}

interface CampusResponse {
  campus: CampusMetrics | null;
  overall?: SnapshotMetrics;
}

interface YoYResponse {
  snapshots: Record<string, Snapshot>;
  settings: AppSettings;
}

interface TimelineResponse {
  timeline: EnrollmentWeek[];
}

export async function getDashboardData(
  request: GetDashboardDataRequest
): Promise<OverviewResponse | CampusResponse | YoYResponse | TimelineResponse> {
  const fn = httpsCallable<GetDashboardDataRequest, OverviewResponse | CampusResponse | YoYResponse | TimelineResponse>(
    functions,
    'getDashboardData'
  );
  const result = await fn(request);
  return result.data;
}

// Snapshot data
interface GetSnapshotDataRequest {
  schoolYear: string;
  campusKey?: string;
}

interface SnapshotResponse {
  snapshot?: Snapshot | null;
  campus?: CampusMetrics | null;
  overall?: SnapshotMetrics;
}

export async function getSnapshotData(
  request: GetSnapshotDataRequest
): Promise<SnapshotResponse> {
  const fn = httpsCallable<GetSnapshotDataRequest, SnapshotResponse>(
    functions,
    'getSnapshotData'
  );
  const result = await fn(request);
  return result.data;
}

// Manual sync (admin only)
interface TriggerManualSyncRequest {
  schoolYear?: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  details: {
    processed: number;
    errors: string[];
  };
}

export async function triggerManualSync(
  request?: TriggerManualSyncRequest
): Promise<SyncResponse> {
  const fn = httpsCallable<TriggerManualSyncRequest, SyncResponse>(
    functions,
    'triggerManualSync'
  );
  const result = await fn(request || {});
  return result.data;
}

// PDF export
interface ExportPDFRequest {
  schoolYear: string;
  reportType: 'annual' | 'campus';
  campusKey?: string;
}

interface ExportPDFResponse {
  url: string;
  expiresIn: string;
}

export async function exportPDF(
  request: ExportPDFRequest
): Promise<ExportPDFResponse> {
  const fn = httpsCallable<ExportPDFRequest, ExportPDFResponse>(
    functions,
    'exportPDF'
  );
  const result = await fn(request);
  return result.data;
}

// CSV export
interface ExportCSVRequest {
  schoolYear: string;
  dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline';
}

interface ExportCSVResponse {
  csv: string;
}

export async function exportCSV(
  request: ExportCSVRequest
): Promise<ExportCSVResponse> {
  const fn = httpsCallable<ExportCSVRequest, ExportCSVResponse>(
    functions,
    'exportCSV'
  );
  const result = await fn(request);
  return result.data;
}

// Get campuses
interface GetCampusesRequest {
  schoolYear: string;
}

interface CampusListItem {
  key: string;
  name: string;
  mcLeader: string;
}

interface GetCampusesResponse {
  campuses: CampusListItem[];
}

export async function getCampuses(
  request: GetCampusesRequest
): Promise<GetCampusesResponse> {
  const fn = httpsCallable<GetCampusesRequest, GetCampusesResponse>(
    functions,
    'getCampuses'
  );
  const result = await fn(request);
  return result.data;
}

// Update settings (admin only)
export async function updateSettings(
  settings: Partial<AppSettings>
): Promise<{ success: boolean }> {
  const fn = httpsCallable<Partial<AppSettings>, { success: boolean }>(
    functions,
    'updateSettings'
  );
  const result = await fn(settings);
  return result.data;
}

// Manage allowed users (admin only)
interface ManageUsersRequest {
  action: 'add' | 'remove' | 'list';
  email?: string;
  isAdmin?: boolean;
}

interface ManageUsersResponse {
  success?: boolean;
  users?: AllowedUser[];
}

export async function manageAllowedUsers(
  request: ManageUsersRequest
): Promise<ManageUsersResponse> {
  const fn = httpsCallable<ManageUsersRequest, ManageUsersResponse>(
    functions,
    'manageAllowedUsers'
  );
  const result = await fn(request);
  return result.data;
}
