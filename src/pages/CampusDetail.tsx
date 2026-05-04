import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampusData, useAllYearsTimelineData, useYoYData } from '@/hooks/useDashboardData';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { getCampusType } from '@/lib/campus-utils';
import { RetentionGauge } from '@/components/charts/RetentionGauge';
import { CampusCumulativeChart } from '@/components/charts/CampusCumulativeChart';
import { ArrowLeft } from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { Snapshot } from '@/types';

interface OutletContext {
  selectedYear: string;
}

export function CampusDetailPage() {
  const { campusKey } = useParams<{ campusKey: string }>();
  const { selectedYear } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCampusData(selectedYear, campusKey || '');
  const { data: timelineData, isLoading: timelineLoading } = useAllYearsTimelineData();
  const { data: yoyData } = useYoYData(selectedYear);

  if (isLoading) {
    return <CampusDetailSkeleton />;
  }

  if (error || !data?.campus) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard/campuses')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campuses
        </Button>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Campus data not available</p>
        </div>
      </div>
    );
  }

  const { campus } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/campuses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {getCampusType(campus.campusName) === 'micro-campus' ? (
            <>
              <h1 className="text-3xl font-bold">{campus.mcLeader || 'Campus'}</h1>
              <p className="text-muted-foreground">
                Campus &middot; {selectedYear}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{campus.campusName}</h1>
              <p className="text-muted-foreground">
                {campus.mcLeader && <>{campus.mcLeader} &middot; </>}{selectedYear}
              </p>
            </>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${campus.requestedStudents ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(campus.totalEnrollment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Returning Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(campus.returningStudents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(campus.newStudents)}</p>
          </CardContent>
        </Card>
        {campus.requestedStudents != null && campus.requestedStudents > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const filled = campus.totalEnrollment;
                const requested = campus.requestedStudents!;
                const pct = Math.round((filled / requested) * 100);
                const isFull = filled >= requested;
                return (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {formatNumber(filled)}{' '}
                      <span className="text-base font-normal text-muted-foreground">
                        / {formatNumber(requested)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-green-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${isFull ? 'text-green-600' : ''}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RetentionGauge
          rate={campus.retentionRate}
          returningStudents={campus.returningStudents}
          eligibleStudents={campus.eligiblePriorYear || campus.returningStudents}
        />

        <Card>
          <CardHeader>
            <CardTitle>Attrition Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Non-Starters</span>
              <span className="font-medium">{formatNumber(campus.nonStarters)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mid-Year Withdrawals</span>
              <span className="font-medium">{formatNumber(campus.midYearWithdrawals)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total Attrition</span>
              <span className="font-bold">
                {formatNumber(campus.nonStarters + campus.midYearWithdrawals)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Trend */}
      {campusKey && yoyData?.snapshots && yoyData.settings?.activeSchoolYears && (
        <RetentionTrend
          campusKey={campusKey}
          snapshots={yoyData.snapshots}
          years={[...yoyData.settings.activeSchoolYears].sort()}
        />
      )}

      {/* Cumulative Enrollment Year-Over-Year */}
      {campusKey && timelineData?.timelines && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Enrollment — Year Over Year</CardTitle>
          </CardHeader>
          <CardContent>
            <CampusCumulativeChart
              timelines={timelineData.timelines}
              campusKeys={[campusKey]}
              height={400}
            />
          </CardContent>
        </Card>
      )}

      {campusKey && timelineLoading && (
        <Skeleton className="h-[450px]" />
      )}
    </div>
  );
}

function getRetentionFill(rate: number): string {
  if (rate > 50) return 'var(--color-success, #22c55e)';
  if (rate >= 20) return 'var(--color-warning, #eab308)';
  return 'var(--color-destructive, #ef4444)';
}

function RetentionTrend({
  campusKey,
  snapshots,
  years,
}: {
  campusKey: string;
  snapshots: Record<string, Snapshot>;
  years: string[];
}) {
  const chartData = years
    .map(year => {
      const campus = snapshots[year]?.byCampus?.[campusKey];
      if (!campus || campus.eligiblePriorYear === 0) return null;
      return {
        year,
        rate: campus.retentionRate,
        fill: getRetentionFill(campus.retentionRate),
      };
    })
    .filter(Boolean) as { year: string; rate: number; fill: string }[];

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Rate History</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [`${formatPercent(value, 0)}`, 'Retention']}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList
                  dataKey="rate"
                  position="top"
                  formatter={(v: number) => formatPercent(v, 0)}
                  style={{ fontSize: 12, fontWeight: 600, fill: 'var(--foreground)' }}
                />
                {chartData.map((entry) => (
                  <Cell key={entry.year} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function CampusDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48 mt-2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
