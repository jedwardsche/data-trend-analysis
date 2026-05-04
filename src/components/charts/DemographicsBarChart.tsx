import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/formatters';
import type { DemographicBreakdown } from '@/types';

interface DemographicsBarChartProps {
  title: string;
  data: DemographicBreakdown[];
  sortByGradeOrder?: boolean;
}

/** Parse a grade-level label into a numeric sort key. */
function gradeOrder(label: string): number {
  const l = label.toLowerCase().trim();
  if (l === 'not reported') return 999;
  if (/^pre[-\s]?k/i.test(l) || l === 'pk' || l === 'preschool') return -1;
  if (l === 'k' || l.startsWith('kinder')) return 0;
  // Extract leading number: "1st", "2nd Grade", "3", "10th", etc.
  const num = l.match(/^(\d+)/);
  if (num) return parseInt(num[1], 10);
  return 998; // unknown labels sort near the end
}

const MAX_LABEL_LENGTH = 18;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TruncatedTick({ x, y, payload, rotated }: any) {
  const label: string = payload?.value ?? '';
  const truncated = label.length > MAX_LABEL_LENGTH
    ? label.slice(0, MAX_LABEL_LENGTH - 1) + '…'
    : label;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor={rotated ? 'end' : 'middle'}
        fill="var(--muted-foreground)"
        fontSize={12}
        transform={rotated ? 'rotate(-45)' : undefined}
      >
        {truncated}
        {label.length > MAX_LABEL_LENGTH && <title>{label}</title>}
      </text>
    </g>
  );
}

export function DemographicsBarChart({ title, data, sortByGradeOrder }: DemographicsBarChartProps) {
  const sortedData = useMemo(() => {
    if (!sortByGradeOrder || !data) return data;
    return [...data].sort((a, b) => gradeOrder(a.category) - gradeOrder(b.category));
  }, [data, sortByGradeOrder]);

  if (!sortedData || sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: sortedData.length > 8 ? 420 : 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="category"
                tick={<TruncatedTick rotated={sortedData.length > 8} />}
                interval={0}
                height={sortedData.length > 8 ? 120 : 30}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatNumber(value), 'Students']}
              />
              <Bar
                dataKey="count"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
