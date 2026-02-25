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
  title: string;
  returningLabel: string;
  newLabel: string;
  returningValue: number;
  newValue: number;
  totalLabel: string;
}

const SEGMENTS = [
  { key: 'returning', cssVar: 'var(--chart-2)' },
  { key: 'new', cssVar: 'var(--chart-3)' },
];

export function GrowthBreakdown({
  title,
  returningLabel,
  newLabel,
  returningValue,
  newValue,
  totalLabel
}: GrowthBreakdownProps) {
  const total = returningValue + newValue;

  const data = [
    {
      name: returningLabel,
      value: returningValue,
      percent: total > 0 ? (returningValue / total) * 100 : 0
    },
    {
      name: newLabel,
      value: newValue,
      percent: total > 0 ? (newValue / total) * 100 : 0
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{totalLabel}</p>
              <p className="text-xl font-bold">{formatNumber(total)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
