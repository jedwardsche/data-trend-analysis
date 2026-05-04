import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useYoYData, useAllYearsTimelineData } from "@/hooks/useDashboardData";
import {
  formatNumber,
  formatPercent,
  formatPercentChange,
} from "@/lib/formatters";
import { CampusCumulativeChart } from "@/components/charts/CampusCumulativeChart";
import { WeeklyEnrollmentYoY } from "@/components/charts/WeeklyEnrollmentYoY";
import { CampusRetentionHeatmap } from "@/components/charts/CampusRetentionHeatmap";
import { getCampusKeysForType } from "@/lib/campus-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface OutletContext {
  selectedYear: string;
}

export function YearOverYearPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useYoYData(selectedYear);
  const { data: timelineData, isLoading: timelineLoading } =
    useAllYearsTimelineData();

  // Derive campus keys by type from the most recent snapshot
  const { branchKeys, microKeys } = useMemo(() => {
    if (!data?.snapshots) return { branchKeys: [], microKeys: [] };

    // Collect all campus keys across all years for completeness
    const allBranch = new Set<string>();
    const allMicro = new Set<string>();

    for (const snapshot of Object.values(data.snapshots)) {
      for (const key of getCampusKeysForType(snapshot.byCampus, "branch")) {
        allBranch.add(key);
      }
      for (const key of getCampusKeysForType(
        snapshot.byCampus,
        "micro-campus",
      )) {
        allMicro.add(key);
      }
    }

    return {
      branchKeys: Array.from(allBranch),
      microKeys: Array.from(allMicro),
    };
  }, [data?.snapshots]);

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
  const years = settings.activeSchoolYears.filter((y) => snapshots[y]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Year-Over-Year Comparison</h1>
        <p className="text-muted-foreground">
          Compare key metrics across school years
        </p>
      </div>

      {/* Enrollment Trend (embedded) */}
      <iframe
        src="https://enroll.che.school/embed/cumulative-enrollment"
        className="w-full border-0 rounded-lg"
        style={{ height: "525px" }}
        title="Cumulative Enrollment"
      />

      {/* Enrollments by Week */}
      {timelineData?.timelines && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Week</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyEnrollmentYoY timelines={timelineData.timelines} />
          </CardContent>
        </Card>
      )}

      {/* Campus Type Cumulative Charts */}
      {timelineData?.timelines && (
        <div className="grid gap-6 lg:grid-cols-2">
          {branchKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Branch Campus Enrollment</CardTitle>
              </CardHeader>
              <CardContent>
                <CampusCumulativeChart
                  timelines={timelineData.timelines}
                  campusKeys={branchKeys}
                />
              </CardContent>
            </Card>
          )}
          {microKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campus Enrollment</CardTitle>
              </CardHeader>
              <CardContent>
                <CampusCumulativeChart
                  timelines={timelineData.timelines}
                  campusKeys={microKeys}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {timelineLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      )}

      {/* Retention Rate Chart */}
      {(() => {
        const retentionData = years
          .filter(y => (snapshots[y].metrics.eligiblePriorYear ?? 0) > 0)
          .map(y => ({
            year: y,
            rate: snapshots[y].metrics.retentionRate,
          }));
        if (retentionData.length === 0) return null;

        return (
          <Card>
            <CardHeader>
              <CardTitle>Retention Rate by Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{ fontSize: 13 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 13 }} />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={80} fill="var(--success)">
                      <LabelList
                        dataKey="rate"
                        position="top"
                        formatter={(v: number) => `${v}%`}
                        style={{ fontSize: 13, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Retention Rate by Campus */}
      <CampusRetentionHeatmap snapshots={snapshots} years={years} />

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Metric</TableHead>
                {years.map((year) => (
                  <TableHead
                    key={year}
                    className="text-right whitespace-nowrap"
                  >
                    {year}
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
                getDisplayOverride={(y) =>
                  (snapshots[y].metrics.eligiblePriorYear ?? 0) === 0
                    ? "N/A"
                    : null
                }
              />
              <MetricRow
                label="Retention Rate"
                years={years}
                getValue={(y) => snapshots[y].metrics.retentionRate}
                format="percent"
                getDisplayOverride={(y) =>
                  (snapshots[y].metrics.eligiblePriorYear ?? 0) === 0
                    ? "N/A"
                    : null
                }
              />
              <MetricRow
                label="Internal Growth"
                years={years}
                getValue={(y) => {
                  // First year: all students are new, so internal growth = total enrollment
                  if ((snapshots[y].metrics.eligiblePriorYear ?? 0) === 0) {
                    return snapshots[y].metrics.totalEnrollment;
                  }
                  return snapshots[y].metrics.internalGrowth;
                }}
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
                getValue={(y) =>
                  settings.nonStartersByYear?.[y] ??
                  snapshots[y].metrics.nonStarters
                }
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
                label="Total Attrition"
                years={years}
                getValue={(y) => {
                  const nonStarters =
                    settings.nonStartersByYear?.[y] ??
                    snapshots[y].metrics.nonStarters;
                  return nonStarters + snapshots[y].metrics.midYearWithdrawals;
                }}
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
      <div className="grid gap-3 md:grid-cols-3">
        {years.slice(1).map((year, index) => {
          const current = snapshots[year].metrics;
          const previous = snapshots[years[index]].metrics;
          const enrollmentGrowth =
            current.totalEnrollment - previous.totalEnrollment;
          const growthPercent = (
            (enrollmentGrowth / previous.totalEnrollment) *
            100
          ).toFixed(1);

          return (
            <Card key={year}>
              <CardHeader className="px-4 py-3 pb-1">
                <CardTitle className="text-base">
                  {years[index]} → {year}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-2 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Enrollment Growth
                  </p>
                  <p className="text-xl font-bold">
                    {enrollmentGrowth > 0 ? "+" : ""}
                    {formatNumber(enrollmentGrowth)}
                    <span className="text-sm ml-1.5 text-muted-foreground">
                      ({growthPercent}%)
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Retention Rate</p>
                    <p className="font-medium">
                      {(current.eligiblePriorYear ?? 0) > 0
                        ? formatPercent(current.retentionRate)
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Growth</p>
                    <p className="font-medium">
                      {formatNumber(current.netGrowth)}
                    </p>
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
  format: "number" | "percent";
  invertColor?: boolean;
  /** Override display for specific years (e.g., "N/A" for first year retention) */
  getDisplayOverride?: (year: string) => string | null;
}

function MetricRow({
  label,
  years,
  getValue,
  format,
  invertColor = false,
  getDisplayOverride,
}: MetricRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">{label}</TableCell>
      {years.map((year, index) => {
        const override = getDisplayOverride?.(year);
        if (override !== null && override !== undefined) {
          return (
            <TableCell
              key={year}
              className="text-right whitespace-nowrap text-muted-foreground"
            >
              {override}
            </TableCell>
          );
        }

        const value = getValue(year);
        const prevValue = index > 0 ? getValue(years[index - 1]) : null;

        const formattedValue =
          format === "percent" ? formatPercent(value) : formatNumber(value);

        // Only show % change for years that have a prior year
        const changeText =
          prevValue !== null && index > 0
            ? formatPercentChange(value, prevValue)
            : null;

        const isPositive = prevValue !== null && value > prevValue;
        const changeColor = invertColor
          ? isPositive
            ? "text-chart-3"
            : "text-success"
          : isPositive
            ? "text-success"
            : "text-chart-3";

        return (
          <TableCell key={year} className="text-right whitespace-nowrap">
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
