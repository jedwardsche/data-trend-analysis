import type { CampusMetrics } from '@/types';

export type CampusType = 'branch' | 'micro-campus';

export function getCampusType(campusName: string): CampusType {
  return campusName.toLowerCase().includes('micro-campus') ? 'micro-campus' : 'branch';
}

export function groupCampusesByType<T extends { campusName: string }>(
  campuses: T[]
): { branch: T[]; microCampus: T[] } {
  const branch: T[] = [];
  const microCampus: T[] = [];

  for (const campus of campuses) {
    if (getCampusType(campus.campusName) === 'micro-campus') {
      microCampus.push(campus);
    } else {
      branch.push(campus);
    }
  }

  return { branch, microCampus };
}

export function getCampusKeysForType(
  byCampus: Record<string, CampusMetrics>,
  type: CampusType
): string[] {
  return Object.entries(byCampus)
    .filter(([, campus]) => getCampusType(campus.campusName) === type)
    .map(([key]) => key);
}
