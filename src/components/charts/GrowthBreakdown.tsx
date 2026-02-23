import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatPercent } from '@/lib/formatters';

interface GrowthBreakdownProps {
  internalGrowth: number;
  newCampusGrowth: number;
}

const SEGMENTS = [
  { key: 'returning', label: 'Returning Campuses', cssVar: 'var(--chart-2)' },
  { key: 'new', label: 'New Campuses', cssVar: 'var(--chart-3)' },
];

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Pie chart */}
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_entry, index) => (
                    <Cell
                      key={SEGMENTS[index].key}
                      fill={SEGMENTS[index].cssVar}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value)} (${formatPercent(data.find(d => d.name === name)?.percent || 0)})`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend + stats beside the chart */}
          <div className="flex-1 space-y-3">
            {data.map((entry, index) => (
              <div key={entry.name} className="flex items-start gap-2.5">
                <div
                  className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: SEGMENTS[index].cssVar }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{entry.name}</p>
                  <p className="text-lg font-bold leading-tight">
                    {formatNumber(entry.value)}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">
                      {formatPercent(entry.percent)}
                    </span>
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">Total New Students</p>
              <p className="text-xl font-bold">{formatNumber(total)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
