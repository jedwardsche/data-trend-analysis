import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { EnrollmentWeek } from '@/types';
import { formatNumber } from '@/lib/formatters';
import { getYearColor } from '@/lib/year-colors';

interface WeeklyEnrollmentYoYProps {
  timelines: Record<string, EnrollmentWeek[]>;
  height?: number;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WeeklyEnrollmentYoY({
  timelines,
  height = 400,
}: WeeklyEnrollmentYoYProps) {
  const { chartData, years } = useMemo(() => {
    const years = Object.keys(timelines).sort().filter(y => y >= '2024-25');

    const maxWeeks = Math.max(
      ...years.map(y => timelines[y]?.length || 0),
    );

    const data: Record<string, number | string>[] = [];

    for (let w = 1; w <= maxWeeks; w++) {
      const row: Record<string, number | string> = { week: w };

      // Use date label from the latest year that has this week
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
          row[year] = weekData.newEnrollments;
        }
      }

      data.push(row);
    }

    return { chartData: data, years };
  }, [timelines]);

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
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name,
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
              dot={{ fill: getYearColor(year), r: 3 }}
              connectNulls
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
