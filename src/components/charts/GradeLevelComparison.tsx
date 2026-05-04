import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/formatters';
import type { DemographicBreakdown } from '@/types';

interface GradeLevelComparisonProps {
  /** Map of year → grade level breakdown */
  dataByYear: Record<string, DemographicBreakdown[]>;
  years: string[];
}

const YEAR_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

/** Parse a grade-level label into a numeric sort key. */
function gradeOrder(label: string): number {
  const l = label.toLowerCase().trim();
  if (l === 'not reported') return 999;
  if (/^pre[-\s]?k/i.test(l) || l === 'pk' || l === 'preschool') return -1;
  if (l === 'k' || l.startsWith('kinder')) return 0;
  const num = l.match(/^(\d+)/);
  if (num) return parseInt(num[1], 10);
  return 998;
}

/** Normalize grade labels: strip "~ " prefix, merge variants like "12th Grade (Second Year)" */
function normalizeGrade(label: string): string {
  let g = label.replace(/^~\s*/, '').trim();
  g = g.replace(/\s*\(.*\)$/, '');
  return g;
}

export function GradeLevelComparison({ dataByYear, years }: GradeLevelComparisonProps) {
  const chartData = useMemo(() => {
    // Normalize and merge grade counts per year
    const normalized: Record<string, Record<string, number>> = {};
    for (const year of years) {
      normalized[year] = {};
      for (const item of dataByYear[year] ?? []) {
        const key = normalizeGrade(item.category);
        normalized[year][key] = (normalized[year][key] ?? 0) + item.count;
      }
    }

    // Collect all unique normalized grades
    const allGrades = new Set<string>();
    for (const year of years) {
      for (const grade of Object.keys(normalized[year])) {
        allGrades.add(grade);
      }
    }

    // Sort grades
    const sortedGrades = [...allGrades].sort((a, b) => gradeOrder(a) - gradeOrder(b));

    // Build chart data: one row per grade, with a column per year
    return sortedGrades.map(grade => {
      const row: Record<string, string | number> = { grade };
      for (const year of years) {
        row[year] = normalized[year][grade] ?? 0;
      }
      return row;
    });
  }, [dataByYear, years]);

  if (years.length < 2 || chartData.length === 0) return null;

  const chartHeight = chartData.length > 8 ? 420 : 300;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade Level Comparison by Year</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: chartData.length > 8 ? 60 : 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 12 }}
                angle={chartData.length > 8 ? -45 : 0}
                textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                height={chartData.length > 8 ? 100 : 30}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [formatNumber(value), undefined]}
              />
              <Legend />
              {years.map((year, i) => (
                <Bar
                  key={year}
                  dataKey={year}
                  name={year}
                  fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
