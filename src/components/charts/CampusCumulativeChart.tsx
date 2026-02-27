import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { EnrollmentWeek } from '@/types';
import { formatNumber } from '@/lib/formatters';
import { getYearColor } from '@/lib/year-colors';

interface CampusCumulativeChartProps {
  timelines: Record<string, EnrollmentWeek[]>;
  campusKeys: string[];
  height?: number;
}

/**
 * Format a date string (yyyy-MM-dd) as a short label (e.g., "Aug 4", "Sep 15").
 */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CampusCumulativeChart({
  timelines,
  campusKeys,
  height = 350,
}: CampusCumulativeChartProps) {
  const { chartData, years } = useMemo(() => {
    const years = Object.keys(timelines).sort();

    // Find max week count across all years
    const maxWeeks = Math.max(
      ...years.map(y => timelines[y]?.length || 0)
    );

    // Build chart data: one row per week number
    const data: Record<string, number | string>[] = [];

    for (let w = 1; w <= maxWeeks; w++) {
      const row: Record<string, number | string> = { week: w };

      // Find a date label from any year that has this week number,
      // preferring the latest year first
      let dateLabel: string | null = null;
      for (let i = years.length - 1; i >= 0; i--) {
        const wk = timelines[years[i]]?.find(wk => wk.weekNumber === w);
        if (wk) {
          dateLabel = shortDate(wk.weekStart);
          break;
        }
      }
      row.dateLabel = dateLabel || `Wk ${w}`;

      for (const year of years) {
        const weekData = timelines[year]?.find(wk => wk.weekNumber === w);
        if (weekData) {
          // Sum cumulative enrollment across selected campus keys
          let total = 0;
          for (const key of campusKeys) {
            total += weekData.byCampus[key]?.cumulativeEnrollment || 0;
          }
          row[year] = total;
        }
      }

      data.push(row);
    }

    return { chartData: data, years };
  }, [timelines, campusKeys]);

  if (years.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No timeline data available
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            interval="preserveStartEnd"
            angle={-35}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)' }}
            tickFormatter={(value) => formatNumber(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Legend />
          {years.map((year) => (
            <Line
              key={year}
              type="monotone"
              dataKey={year}
              stroke={getYearColor(year)}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
