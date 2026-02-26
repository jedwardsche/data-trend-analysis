import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrollmentTimeline } from '@/components/charts/EnrollmentTimeline';
import { useTimelineData, useOverviewData } from '@/hooks/useDashboardData';
import { formatNumber, formatDate } from '@/lib/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OutletContext {
  selectedYear: string;
}

export function TimelinePage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useTimelineData(selectedYear);
  const { data: overviewData } = useOverviewData(selectedYear);
  const [view, setView] = useState<'cumulative' | 'weekly'>('cumulative');

  // Determine if this is the current/ongoing school year
  const activeYears = overviewData?.settings?.activeSchoolYears;
  const latestYear = activeYears ? [...activeYears].sort().pop() : undefined;
  const enrollmentLabel = selectedYear === latestYear ? 'Current Enrollment' : 'Final Enrollment';

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error || !data?.timeline || data.timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No timeline data available for {selectedYear}</p>
      </div>
    );
  }

  const { timeline } = data;

  // Find peak enrollment week
  const peakWeek = timeline.reduce((max, week) =>
    week.newEnrollments > max.newEnrollments ? week : max
  );

  // Calculate total new enrollments
  const totalNew = timeline.reduce((sum, week) => sum + week.newEnrollments, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enrollment Timeline</h1>
        <p className="text-muted-foreground">
          Track when students enrolled throughout {selectedYear}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {enrollmentLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatNumber(timeline[timeline.length - 1]?.cumulativeEnrollment || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peak Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              Week {peakWeek.weekNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(peakWeek.newEnrollments)} new enrollments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {timeline.length} weeks
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(timeline[0].weekStart)} – {formatDate(timeline[timeline.length - 1].weekStart)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrollment Over Time</CardTitle>
            <Tabs value={view} onValueChange={(v) => setView(v as 'cumulative' | 'weekly')}>
              <TabsList>
                <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <EnrollmentTimeline
            timeline={timeline}
            showCumulative={view === 'cumulative'}
          />
        </CardContent>
      </Card>

      {/* Weekly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">New Enrollments</TableHead>
                <TableHead className="text-right">Cumulative Total</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline.map(week => (
                <TableRow key={week.id}>
                  <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                  <TableCell>{new Date(week.weekStart).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{formatNumber(week.newEnrollments)}</TableCell>
                  <TableCell className="text-right">{formatNumber(week.cumulativeEnrollment)}</TableCell>
                  <TableCell className="text-right">
                    {totalNew > 0 ? ((week.newEnrollments / totalNew) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
