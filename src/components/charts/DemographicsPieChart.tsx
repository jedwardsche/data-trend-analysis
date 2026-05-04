import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatNumber, formatPercent } from '@/lib/formatters';
import type { DemographicBreakdown } from '@/types';

interface DemographicsPieChartProps {
  title: string;
  data: DemographicBreakdown[];
  colorMap?: Record<string, string>;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#7C8DB0',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transform: 'scale(1.08)',
        transition: 'transform 150ms ease',
      }}
    >
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

const NOT_REPORTED_COLOR = '#9ca3af'; // neutral gray

function getColor(index: number, category: string, colorMap?: Record<string, string>): string {
  if (colorMap?.[category]) return colorMap[category];
  if (category === 'Not Reported') return NOT_REPORTED_COLOR;
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function DemographicsPieChart({ title, data, colorMap }: DemographicsPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (!data || data.length === 0) {
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
        <div className="flex items-start gap-4">
          <div className="w-[160px] flex-shrink-0">
            <div className="w-[160px] h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                    stroke="none"
                    activeIndex={activeIndex ?? undefined}
                    activeShape={ActiveShape}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={getColor(index, entry.category, colorMap)}
                        opacity={activeIndex !== null && activeIndex !== index ? 0.4 : 1}
                        style={{ transition: 'opacity 150ms ease' }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {activeIndex !== null && data[activeIndex] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center px-1" style={{ maxWidth: 68 }}>
                    <div className="text-xs font-semibold tabular-nums leading-tight">
                      {formatPercent(data[activeIndex].percent, 1)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-1.5 min-h-[32px]">
              {activeIndex !== null && data[activeIndex] && (
                <p className="text-xs text-center text-muted-foreground leading-tight">
                  {data[activeIndex].category}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-1.5 max-h-[200px] overflow-y-auto">
            {data.map((entry, index) => (
              <div
                key={entry.category}
                className="flex items-center gap-2 text-sm rounded px-1 py-0.5 cursor-default transition-colors duration-150"
                style={{
                  backgroundColor: activeIndex === index ? 'var(--accent)' : 'transparent',
                  opacity: activeIndex !== null && activeIndex !== index ? 0.5 : 1,
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getColor(index, entry.category, colorMap) }}
                />
                <TruncatedLabel text={entry.category} />
                <span className="font-medium tabular-nums">{formatNumber(entry.count)}</span>
                <span className="text-muted-foreground tabular-nums w-12 text-right">
                  {formatPercent(entry.percent, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TruncatedLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, [text]);

  const span = (
    <span ref={ref} className="truncate flex-1 text-muted-foreground">
      {text}
    </span>
  );

  if (!isTruncated) return span;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{span}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
