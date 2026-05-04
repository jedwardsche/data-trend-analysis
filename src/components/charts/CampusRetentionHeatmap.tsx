import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';
import { getCampusType } from '@/lib/campus-utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Snapshot } from '@/types';

interface CampusRetentionHeatmapProps {
  snapshots: Record<string, Snapshot>;
  years: string[];
}

interface CampusRow {
  key: string;
  displayName: string;
  type: 'branch' | 'micro-campus';
  cells: Record<string, { rate: number; eligible: number } | null>;
}

function getRetentionBg(rate: number): string {
  if (rate > 50) return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
  if (rate >= 20) return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
  return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300';
}

export function CampusRetentionHeatmap({ snapshots, years }: CampusRetentionHeatmapProps) {
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [microsOpen, setMicrosOpen] = useState(true);

  const rows = useMemo(() => {
    const campusMap = new Map<string, CampusRow>();

    for (const year of years) {
      const snapshot = snapshots[year];
      if (!snapshot?.byCampus) continue;

      for (const [key, campus] of Object.entries(snapshot.byCampus)) {
        if (!campusMap.has(key)) {
          const isMicro = getCampusType(campus.campusName) === 'micro-campus';
          campusMap.set(key, {
            key,
            displayName: isMicro
              ? (campus.mcLeader || 'Campus')
              : campus.campusName,
            type: getCampusType(campus.campusName),
            cells: {},
          });
        }
        campusMap.get(key)!.cells[year] = {
          rate: campus.retentionRate,
          eligible: campus.eligiblePriorYear,
        };
      }
    }

    const all = [...campusMap.values()];
    const branches = all.filter(r => r.type === 'branch').sort((a, b) => a.displayName.localeCompare(b.displayName));
    const micros = all.filter(r => r.type === 'micro-campus').sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { branches, micros };
  }, [snapshots, years]);

  if (rows.branches.length === 0 && rows.micros.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Rate by Campus</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground sticky left-0 bg-card min-w-[180px]">
                Campus
              </th>
              {years.map(year => (
                <th key={year} className="text-center py-2 px-3 font-medium text-muted-foreground min-w-[80px]">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.branches.length > 0 && (
              <>
                <tr>
                  <td colSpan={years.length + 1} className="pt-3 pb-1">
                    <button
                      onClick={() => setBranchesOpen(!branchesOpen)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      {branchesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      Branches ({rows.branches.length})
                    </button>
                  </td>
                </tr>
                {branchesOpen && rows.branches.map(row => (
                  <HeatmapRow key={row.key} row={row} years={years} />
                ))}
              </>
            )}
            {rows.micros.length > 0 && (
              <>
                <tr>
                  <td colSpan={years.length + 1} className="pt-4 pb-1">
                    <button
                      onClick={() => setMicrosOpen(!microsOpen)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                      {microsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      Campuses ({rows.micros.length})
                    </button>
                  </td>
                </tr>
                {microsOpen && rows.micros.map(row => (
                  <HeatmapRow key={row.key} row={row} years={years} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function HeatmapRow({ row, years }: { row: CampusRow; years: string[] }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-4 font-medium sticky left-0 bg-card truncate max-w-[200px]" title={row.displayName}>
        {row.displayName}
      </td>
      {years.map(year => {
        const cell = row.cells[year];
        if (!cell) {
          return (
            <td key={year} className="text-center py-1.5 px-3">
              <span className="text-muted-foreground/50">&mdash;</span>
            </td>
          );
        }
        if (cell.eligible === 0) {
          return (
            <td key={year} className="text-center py-1.5 px-3">
              <span className="text-muted-foreground text-xs">N/A</span>
            </td>
          );
        }
        return (
          <td key={year} className="text-center py-1.5 px-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${getRetentionBg(cell.rate)}`}>
              {formatPercent(cell.rate, 0)}
            </span>
          </td>
        );
      })}
    </tr>
  );
}
