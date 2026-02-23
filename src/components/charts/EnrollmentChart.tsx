import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Snapshot } from '@/types';
import { formatNumber } from '@/lib/formatters';

interface EnrollmentChartProps {
  snapshots: Record<string, Snapshot>;
  title?: string;
}

export function EnrollmentChart({ snapshots, title = 'Enrollment by Year' }: EnrollmentChartProps) {
  const data = Object.entries(snapshots)
    .map(([year, snapshot]) => ({
      year,
      total: snapshot.metrics.totalEnrollment,
      returning: snapshot.metrics.returningStudents,
      newInternal: snapshot.metrics.internalGrowth,
      newCampus: snapshot.metrics.newCampusGrowth
    }))
    .sort((a, b) => a.year.localeCompare(b.year));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--muted-foreground)' }}
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
                formatter={(value: number) => formatNumber(value)}
              />
              <Legend />
              <Bar
                dataKey="returning"
                name="Returning Students"
                stackId="a"
                fill="var(--chart-1)"
              />
              <Bar
                dataKey="newInternal"
                name="New (Returning Campuses)"
                stackId="a"
                fill="var(--chart-2)"
              />
              <Bar
                dataKey="newCampus"
                name="New (New Campuses)"
                stackId="a"
                fill="var(--chart-3)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
