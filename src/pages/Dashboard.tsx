import { useOutletContext } from "react-router-dom";
import { MetricCard } from "@/components/cards/MetricCard";
import { RetentionGauge } from "@/components/charts/RetentionGauge";
import { GrowthBreakdown } from "@/components/charts/GrowthBreakdown";
import { useOverviewData, useYoYData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <p className="text-muted-foreground">
          No data available for {selectedYear}
        </p>
      </div>
    );
  }

  const { snapshot, settings } = data;
  const m = snapshot.metrics;

  // Get previous year data for comparison
  const previousYear =
    settings.activeSchoolYears[
      settings.activeSchoolYears.indexOf(selectedYear) - 1
    ];
  const previousSnapshot = yoyData?.snapshots?.[previousYear];
  const pm = previousSnapshot?.metrics;

  // Derive campus counts from byCampus data
  const campusList = Object.values(snapshot.byCampus || {});
  const newCampusCount = campusList.filter((c) => c.isNewCampus === true).length;
  const returningCampusCount = campusList.length - newCampusCount;

  // Determine if this is the current/ongoing school year (latest in active list)
  const latestYear = [...settings.activeSchoolYears].sort().pop();
  const isCurrentYear = selectedYear === latestYear;
  const isFirstYear = !previousYear;
  const hideComparisons = isCurrentYear || isFirstYear;
  const enrollmentLabel = isCurrentYear
    ? "Current Enrollment"
    : "Final Enrollment";

  // Funded students from admin settings
  const yearFundingEntry = settings.fundingByYear?.[selectedYear];
  const fundedStudents =
    yearFundingEntry != null && typeof yearFundingEntry === "object"
      ? yearFundingEntry.students
      : null;

  // Non-starters: use manual override from settings if available, otherwise snapshot
  const nonStarters =
    settings.nonStartersByYear?.[selectedYear] ?? m.nonStarters;
  // Recalculate total attrition using the (possibly overridden) non-starters
  const totalAttrition = nonStarters + m.midYearWithdrawals;

  // Show retention gauge only for past years that have prior year data
  const showRetention = !isCurrentYear && (m.eligiblePriorYear ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          School Year {selectedYear} • Last updated:{" "}
          {new Date(snapshot.createdAt).toLocaleDateString()}
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
            <div className="text-2xl font-bold">
              {m.totalEnrollment.toLocaleString()}
            </div>
            {isCurrentYear ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Enrollment in progress
                <span className="flex gap-0.5">
                  <span className="size-1 rounded-full bg-muted-foreground animate-pulse" />
                  <span className="size-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
                  <span className="size-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:600ms]" />
                </span>
              </p>
            ) : !hideComparisons && pm?.totalEnrollment !== undefined ? (
              <p
                className={`text-xs ${
                  m.totalEnrollment > pm.totalEnrollment
                    ? "text-success"
                    : m.totalEnrollment < pm.totalEnrollment
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {m.totalEnrollment > pm.totalEnrollment ? "+" : ""}
                {(
                  ((m.totalEnrollment - pm.totalEnrollment) /
                    pm.totalEnrollment) *
                  100
                ).toFixed(1)}
                % from previous year
              </p>
            ) : null}
            {(fundedStudents != null || (m.requestedStudents != null && m.requestedStudents > 0)) && (
              <div className="mt-3 pt-3 border-t flex justify-between">
                {fundedStudents != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Funded</p>
                    <p className="text-lg font-semibold">{fundedStudents.toLocaleString()}</p>
                  </div>
                )}
                {m.requestedStudents != null && m.requestedStudents > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Requested</p>
                    <p className="text-lg font-semibold">{m.requestedStudents.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <MetricCard
          title="Returning Students"
          value={m.returningStudents}
          previousValue={hideComparisons ? undefined : pm?.returningStudents}
        />
        <MetricCard
          title="New Students"
          value={m.totalNewGrowth}
          previousValue={hideComparisons ? undefined : pm?.totalNewGrowth}
          description=""
        />
        <MetricCard
          title="Net Growth"
          value={m.netGrowth}
          previousValue={hideComparisons ? undefined : pm?.netGrowth}
          description="New students minus withdrawals"
        />
      </div>

      {/* Second Row */}
      <div
        className={`grid gap-4 md:grid-cols-2 ${showRetention ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        {showRetention && (
          <RetentionGauge
            rate={m.retentionRate}
            returningStudents={m.returningStudents}
            eligibleStudents={m.eligiblePriorYear}
          />
        )}
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
      </div>

      {/* Attrition Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Non-Starters"
          value={nonStarters}
          previousValue={hideComparisons ? undefined : pm?.nonStarters}
          description="Enrolled but never attended"
        />
        <MetricCard
          title="Mid-Year Withdrawals"
          value={m.midYearWithdrawals}
          previousValue={hideComparisons ? undefined : pm?.midYearWithdrawals}
          description="Left after attending"
        />
        <MetricCard
          title="Total Attrition"
          value={totalAttrition}
          previousValue={
            hideComparisons
              ? undefined
              : pm
                ? pm.nonStarters + pm.midYearWithdrawals
                : undefined
          }
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
