import { useOutletContext } from 'react-router-dom';
import { MetricCard } from '@/components/cards/MetricCard';
import { RetentionGauge } from '@/components/charts/RetentionGauge';
import { GrowthBreakdown } from '@/components/charts/GrowthBreakdown';
import { useOverviewData, useYoYData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, resolveFundingTotal } from '@/lib/formatters';
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

  // Derive campus counts from byCampus data
  const campusList = Object.values(snapshot.byCampus || {});
  const returningCampusCount = campusList.filter(c => c.returningStudents > 0).length;
  const newCampusCount = campusList.filter(c => c.returningStudents === 0).length;

  // Calculate ERBOCES revenue from per-year funding data
  const yearFundingEntry = settings.fundingByYear?.[selectedYear];
  const storedFunding = resolveFundingTotal(yearFundingEntry);
  const erbocesRevenue = storedFunding ?? 0;
  const isActualFunding = storedFunding != null;
  const yearFundingObj = yearFundingEntry != null && typeof yearFundingEntry === 'object'
    ? yearFundingEntry : null;

  const previousStoredFunding = previousYear
    ? resolveFundingTotal(settings.fundingByYear?.[previousYear])
    : undefined;
  const previousRevenue = previousStoredFunding ?? undefined;

  // Determine if this is the current/ongoing school year (latest in active list)
  const latestYear = [...settings.activeSchoolYears].sort().pop();
  const enrollmentLabel = selectedYear === latestYear ? 'Current Enrollment' : 'Final Enrollment';

  // Funded students from admin settings
  const fundedStudents = yearFundingObj?.students ?? null;

  // Non-starters: use manual override from settings if available, otherwise snapshot
  const nonStarters = settings.nonStartersByYear?.[selectedYear] ?? m.nonStarters;

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {enrollmentLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.totalEnrollment.toLocaleString()}</div>
            {pm?.totalEnrollment !== undefined && (
              <p className={`text-xs ${
                m.totalEnrollment > pm.totalEnrollment ? 'text-success' :
                m.totalEnrollment < pm.totalEnrollment ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {m.totalEnrollment > pm.totalEnrollment ? '+' : ''}
                {(((m.totalEnrollment - pm.totalEnrollment) / pm.totalEnrollment) * 100).toFixed(1)}% from previous year
              </p>
            )}
            {fundedStudents != null && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">Total Funded</p>
                <p className="text-lg font-semibold">{fundedStudents.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RetentionGauge
          rate={m.retentionRate}
          returningStudents={m.returningStudents}
          eligibleStudents={pm ? pm.totalEnrollment - (pm.verifiedTransfers || 0) : m.returningStudents}
        />
        <GrowthBreakdown
          title="Student Growth"
          returningLabel="Returning Students"
          newLabel="New Students"
          returningValue={m.returningStudents}
          newValue={m.totalNewGrowth}
          totalLabel="Total Students"
        />
        <GrowthBreakdown
          title="Campus Growth"
          returningLabel="Returning Campuses"
          newLabel="New Campuses"
          returningValue={returningCampusCount}
          newValue={newCampusCount}
          totalLabel="Total Campuses"
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
              {isActualFunding && yearFundingObj
                ? `${yearFundingObj.students.toLocaleString()} students × $${yearFundingObj.perStudentCost.toLocaleString()}/student`
                : isActualFunding
                  ? 'Total funding'
                  : 'No funding data — configure in Admin'}
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
          value={nonStarters}
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
