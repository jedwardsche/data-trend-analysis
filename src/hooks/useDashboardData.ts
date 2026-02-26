import { useQuery } from '@tanstack/react-query';
import { getDashboardData, getSnapshotData, getCampuses } from '@/lib/functions';
import type { Snapshot, AppSettings, CampusMetrics, SnapshotMetrics, EnrollmentWeek, CampusListItem } from '@/types';

interface OverviewData {
  snapshot: Snapshot | null;
  settings: AppSettings;
  isAdmin?: boolean;
}

interface CampusData {
  campus: CampusMetrics | null;
  overall?: SnapshotMetrics;
}

interface YoYData {
  snapshots: Record<string, Snapshot>;
  settings: AppSettings;
}

interface TimelineData {
  timeline: EnrollmentWeek[];
}

interface AllYearsTimelineData {
  timelines: Record<string, EnrollmentWeek[]>;
  settings: AppSettings;
}

export function useOverviewData(schoolYear: string) {
  return useQuery<OverviewData>({
    queryKey: ['dashboard', 'overview', schoolYear],
    queryFn: async () => {
      const result = await getDashboardData({
        schoolYear,
        view: 'overview'
      });
      return result as OverviewData;
    },
    enabled: !!schoolYear,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useCampusData(schoolYear: string, campusKey: string) {
  return useQuery<CampusData>({
    queryKey: ['dashboard', 'campus', schoolYear, campusKey],
    queryFn: async () => {
      const result = await getDashboardData({
        schoolYear,
        view: 'campus',
        campusKey
      });
      return result as CampusData;
    },
    enabled: !!schoolYear && !!campusKey,
    staleTime: 5 * 60 * 1000
  });
}

export function useYoYData(schoolYear: string) {
  return useQuery<YoYData>({
    queryKey: ['dashboard', 'yoy', schoolYear],
    queryFn: async () => {
      const result = await getDashboardData({
        schoolYear,
        view: 'yoy'
      });
      return result as YoYData;
    },
    enabled: !!schoolYear,
    staleTime: 5 * 60 * 1000
  });
}

export function useTimelineData(schoolYear: string) {
  return useQuery<TimelineData>({
    queryKey: ['dashboard', 'timeline', schoolYear],
    queryFn: async () => {
      const result = await getDashboardData({
        schoolYear,
        view: 'timeline'
      });
      return result as TimelineData;
    },
    enabled: !!schoolYear,
    staleTime: 5 * 60 * 1000
  });
}

export function useAllYearsTimelineData() {
  return useQuery<AllYearsTimelineData>({
    queryKey: ['dashboard', 'campusYoYTimeline'],
    queryFn: async () => {
      const result = await getDashboardData({
        schoolYear: 'all',
        view: 'campusYoYTimeline'
      });
      return result as AllYearsTimelineData;
    },
    staleTime: 5 * 60 * 1000
  });
}

export function useSnapshotData(schoolYear: string, campusKey?: string) {
  return useQuery({
    queryKey: ['snapshot', schoolYear, campusKey],
    queryFn: () => getSnapshotData({ schoolYear, campusKey }),
    enabled: !!schoolYear,
    staleTime: 5 * 60 * 1000
  });
}

export function useCampusList(schoolYear: string) {
  return useQuery<CampusListItem[]>({
    queryKey: ['campuses', schoolYear],
    queryFn: async () => {
      const result = await getCampuses({ schoolYear });
      return result.campuses;
    },
    enabled: !!schoolYear,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}
