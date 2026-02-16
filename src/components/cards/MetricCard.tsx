import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent, formatCurrency } from '@/lib/formatters';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'percent' | 'currency';
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  description,
  className
}: MetricCardProps) {
  const formattedValue = format === 'percent'
    ? formatPercent(value)
    : format === 'currency'
      ? formatCurrency(value)
      : formatNumber(value);

  const change = previousValue !== undefined
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const TrendIcon = change === null
    ? null
    : change > 0
      ? TrendingUp
      : change < 0
        ? TrendingDown
        : Minus;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {TrendIcon && (
          <TrendIcon
            className={cn(
              'h-4 w-4',
              change !== null && change > 0 && 'text-green-500',
              change !== null && change < 0 && 'text-red-500',
              change === 0 && 'text-muted-foreground'
            )}
          />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {change !== null && (
          <p className={cn(
            'text-xs',
            change > 0 && 'text-green-500',
            change < 0 && 'text-red-500',
            change === 0 && 'text-muted-foreground'
          )}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}% from previous year
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
