import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EnrollmentWeek } from '@/types';
import { formatNumber, formatDateShort } from '@/lib/formatters';

interface EnrollmentTimelineProps {
  timeline: EnrollmentWeek[];
  showCumulative?: boolean;
}

export function EnrollmentTimeline({ timeline, showCumulative = true }: EnrollmentTimelineProps) {
  const data = timeline.map(week => ({
    week: `W${week.weekNumber}`,
    date: formatDateShort(week.weekStart),
    new: week.newEnrollments,
    cumulative: week.cumulativeEnrollment
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {showCumulative ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
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
                    name === 'cumulative' ? 'Total Enrolled' : 'New This Week'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
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
                  formatter={(value: number) => [formatNumber(value), 'New Enrollments']}
                />
                <Line
                  type="monotone"
                  dataKey="new"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--chart-2)' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
