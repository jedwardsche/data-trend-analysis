import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrollmentChart } from '@/components/charts/EnrollmentChart';
import { useYoYData } from '@/hooks/useDashboardData';
import { formatNumber, formatPercent, formatPercentChange } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';

interface OutletContext {
  selectedYear: string;
}

export function YearOverYearPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useYoYData(selectedYear);

  if (isLoading) {
    return <YoYSkeleton />;
  }

  if (error || !data?.snapshots) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No historical data available</p>
      </div>
    );
  }

  const { snapshots, settings } = data;
  const years = settings.activeSchoolYears.filter(y => snapshots[y]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Year-Over-Year Comparison</h1>
        <p className="text-muted-foreground">
          Compare key metrics across school years
        </p>
      </div>

      {/* Enrollment Chart */}
      <EnrollmentChart snapshots={snapshots} />

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {years.map(year => (
                  <TableHead key={year} className="text-right">
                    {year}
                    {year === settings.currentSchoolYear && (
                      <Badge variant="outline" className="ml-2">Current</Badge>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <MetricRow
                label="Total Enrollment"
                years={years}
                getValue={(y) => snapshots[y].metrics.totalEnrollment}
                format="number"
              />
              <MetricRow
                label="Returning Students"
                years={years}
                getValue={(y) => snapshots[y].metrics.returningStudents}
                format="number"
              />
              <MetricRow
                label="Retention Rate"
                years={years}
                getValue={(y) => snapshots[y].metrics.retentionRate}
                format="percent"
              />
              <MetricRow
                label="Internal Growth"
                years={years}
                getValue={(y) => snapshots[y].metrics.internalGrowth}
                format="number"
              />
              <MetricRow
                label="New Campus Growth"
                years={years}
                getValue={(y) => snapshots[y].metrics.newCampusGrowth}
                format="number"
              />
              <MetricRow
                label="Total New Students"
                years={years}
                getValue={(y) => snapshots[y].metrics.totalNewGrowth}
                format="number"
              />
              <MetricRow
                label="Non-Starters"
                years={years}
                getValue={(y) => snapshots[y].metrics.nonStarters}
                format="number"
                invertColor
              />
              <MetricRow
                label="Mid-Year Withdrawals"
                years={years}
                getValue={(y) => snapshots[y].metrics.midYearWithdrawals}
                format="number"
                invertColor
              />
              <MetricRow
                label="Net Growth"
                years={years}
                getValue={(y) => snapshots[y].metrics.netGrowth}
                format="number"
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Growth Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        {years.slice(1).map((year, index) => {
          const current = snapshots[year].metrics;
          const previous = snapshots[years[index]].metrics;
          const enrollmentGrowth = current.totalEnrollment - previous.totalEnrollment;
          const growthPercent = ((enrollmentGrowth / previous.totalEnrollment) * 100).toFixed(1);

          return (
            <Card key={year}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {years[index]} → {year}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Enrollment Growth</p>
                  <p className="text-2xl font-bold">
                    {enrollmentGrowth > 0 ? '+' : ''}{formatNumber(enrollmentGrowth)}
                    <span className="text-lg ml-2 text-muted-foreground">
                      ({growthPercent}%)
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Retention Rate</p>
                    <p className="font-medium">{formatPercent(current.retentionRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Growth</p>
                    <p className="font-medium">{formatNumber(current.netGrowth)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  years: string[];
  getValue: (year: string) => number;
  format: 'number' | 'percent';
  invertColor?: boolean;
}

function MetricRow({ label, years, getValue, format, invertColor = false }: MetricRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      {years.map((year, index) => {
        const value = getValue(year);
        const prevValue = index > 0 ? getValue(years[index - 1]) : null;

        const formattedValue = format === 'percent'
          ? formatPercent(value)
          : formatNumber(value);

        const changeText = prevValue !== null
          ? formatPercentChange(value, prevValue)
          : null;

        const isPositive = prevValue !== null && value > prevValue;
        const changeColor = invertColor
          ? (isPositive ? 'text-red-500' : 'text-green-500')
          : (isPositive ? 'text-green-500' : 'text-red-500');

        return (
          <TableCell key={year} className="text-right">
            <span>{formattedValue}</span>
            {changeText && (
              <span className={`text-xs ml-2 ${changeColor}`}>
                {changeText}
              </span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function YoYSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48 mt-2" />
      </div>
      <Skeleton className="h-[350px]" />
      <Skeleton className="h-96" />
    </div>
  );
}
