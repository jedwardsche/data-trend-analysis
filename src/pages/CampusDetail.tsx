import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampusData, useAllYearsTimelineData } from '@/hooks/useDashboardData';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { getCampusType } from '@/lib/campus-utils';
import { RetentionGauge } from '@/components/charts/RetentionGauge';
import { CampusCumulativeChart } from '@/components/charts/CampusCumulativeChart';
import { ArrowLeft } from 'lucide-react';

interface OutletContext {
  selectedYear: string;
}

export function CampusDetailPage() {
  const { campusKey } = useParams<{ campusKey: string }>();
  const { selectedYear } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCampusData(selectedYear, campusKey || '');
  const { data: timelineData, isLoading: timelineLoading } = useAllYearsTimelineData();

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
              <h1 className="text-3xl font-bold">{campus.mcLeader || 'Micro-Campus'}</h1>
              <p className="text-muted-foreground">
                Micro-Campus &middot; {selectedYear}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{campus.campusName}</h1>
              <p className="text-muted-foreground">
                {campus.mcLeader && <>MC Leader: {campus.mcLeader} &middot; </>}{selectedYear}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(campus.attendanceRate)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RetentionGauge
          rate={campus.retentionRate}
          returningStudents={campus.returningStudents}
          eligibleStudents={campus.returningStudents + campus.nonStarters + campus.midYearWithdrawals}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
