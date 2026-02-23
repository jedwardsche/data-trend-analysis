import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface GrowthBreakdownProps {
  internalGrowth: number;
  newCampusGrowth: number;
}

export function GrowthBreakdown({ internalGrowth, newCampusGrowth }: GrowthBreakdownProps) {
  const total = internalGrowth + newCampusGrowth;

  const data = [
    {
      name: 'Returning Campuses',
      value: internalGrowth,
      percent: total > 0 ? (internalGrowth / total) * 100 : 0
    },
    {
      name: 'New Campuses',
      value: newCampusGrowth,
      percent: total > 0 ? (newCampusGrowth / total) * 100 : 0
    }
  ];

  const COLORS = ['var(--chart-2)', 'var(--chart-3)'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  `${formatNumber(value)} (${formatPercent(data.find(d => d.name === name)?.percent || 0)})`,
                  name
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <p className="text-2xl font-bold">{formatNumber(total)}</p>
          <p className="text-sm text-muted-foreground">Total New Students</p>
        </div>
      </CardContent>
    </Card>
  );
}
