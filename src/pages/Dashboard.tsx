import { useOutletContext } from 'react-router-dom';
import { MetricCard } from '@/components/cards/MetricCard';
import { RetentionGauge } from '@/components/charts/RetentionGauge';
import { GrowthBreakdown } from '@/components/charts/GrowthBreakdown';
import { useOverviewData, useYoYData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OutletContext {
  selectedYear: string;
}

export function DashboardPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useOverviewData(selectedYear);
  const { data: yoyData } = useYoYData(selectedYear);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load dashboard data</p>
      </div>
    );
  }

  if (!data?.snapshot) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available for {selectedYear}</p>
      </div>
    );
  }

  const { snapshot, settings } = data;
  const m = snapshot.metrics;

  // Get previous year data for comparison
  const previousYear = settings.activeSchoolYears[
    settings.activeSchoolYears.indexOf(selectedYear) - 1
  ];
  const previousSnapshot = yoyData?.snapshots?.[previousYear];
  const pm = previousSnapshot?.metrics;

  // Calculate ERBOCES revenue — use stored total for past years, projection for current/future
  const storedFunding = settings.fundingByYear?.[selectedYear];
  const projectedRevenue = settings.erbocesPerStudentCost * m.totalEnrollment;
  const erbocesRevenue = storedFunding ?? projectedRevenue;
  const isActualFunding = storedFunding != null;

  const previousStoredFunding = previousYear ? settings.fundingByYear?.[previousYear] : undefined;
  const previousRevenue = pm
    ? (previousStoredFunding ?? settings.erbocesPerStudentCost * pm.totalEnrollment)
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          School Year {selectedYear} • Last updated: {new Date(snapshot.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Enrollment"
          value={m.totalEnrollment}
          previousValue={pm?.totalEnrollment}
        />
        <MetricCard
          title="Returning Students"
          value={m.returningStudents}
          previousValue={pm?.returningStudents}
        />
        <MetricCard
          title="New Students"
          value={m.totalNewGrowth}
          previousValue={pm?.totalNewGrowth}
          description="At returning + new campuses"
        />
        <MetricCard
          title="Net Growth"
          value={m.netGrowth}
          previousValue={pm?.netGrowth}
          description="New students minus withdrawals"
        />
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RetentionGauge
          rate={m.retentionRate}
          returningStudents={m.returningStudents}
          eligibleStudents={pm ? pm.totalEnrollment - (pm.verifiedTransfers || 0) : m.returningStudents}
        />
        <GrowthBreakdown
          internalGrowth={m.internalGrowth}
          newCampusGrowth={m.newCampusGrowth}
        />
        <Card>
          <CardHeader>
            <CardTitle>
              ERBOCES {isActualFunding ? 'Total' : 'Projected'} Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[200px]">
            <p className="text-4xl font-bold text-success">
              {formatCurrency(erbocesRevenue)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isActualFunding
                ? 'Actual total funding'
                : `${m.totalEnrollment.toLocaleString()} students × $${settings.erbocesPerStudentCost.toLocaleString()}/student`
              }
            </p>
            {previousRevenue && (
              <p className="text-xs text-muted-foreground mt-1">
                Previous year: {formatCurrency(previousRevenue)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attrition Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Non-Starters"
          value={m.nonStarters}
          previousValue={pm?.nonStarters}
          description="Enrolled but never attended"
        />
        <MetricCard
          title="Mid-Year Withdrawals"
          value={m.midYearWithdrawals}
          previousValue={pm?.midYearWithdrawals}
          description="Left after attending"
        />
        <MetricCard
          title="Total Attrition"
          value={m.attritionTotal}
          previousValue={pm?.attritionTotal}
          description="Non-starters + withdrawals"
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
