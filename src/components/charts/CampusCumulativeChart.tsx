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

const YEAR_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

interface CampusCumulativeChartProps {
  timelines: Record<string, EnrollmentWeek[]>;
  campusKeys: string[];
  height?: number;
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
            dataKey="week"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            label={{
              value: 'Week',
              position: 'insideBottom',
              offset: -5,
              fill: 'var(--muted-foreground)',
              fontSize: 12
            }}
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
            labelFormatter={(label) => `Week ${label}`}
          />
          <Legend />
          {years.map((year, index) => (
            <Line
              key={year}
              type="monotone"
              dataKey={year}
              stroke={YEAR_COLORS[index % YEAR_COLORS.length]}
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
