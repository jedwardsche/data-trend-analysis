import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverviewData } from '@/hooks/useDashboardData';
import { formatNumber, formatPercent, getRetentionColor } from '@/lib/formatters';
import { Search, ChevronDown, ChevronRight, ArrowUpDown, Building2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { CampusMetrics } from '@/types';

interface OutletContext {
  selectedYear: string;
}

type SortField = 'campusName' | 'totalEnrollment' | 'returningStudents' | 'newStudents' | 'retentionRate';
type CampusFilter = 'all' | 'new' | 'returning';

interface CampusWithKey extends CampusMetrics {
  key: string;
}

export function CampusesPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useOverviewData(selectedYear);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalEnrollment');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [campusFilter, setCampusFilter] = useState<CampusFilter>('all');
  const [campusesOpen, setCampusesOpen] = useState(true);

  if (isLoading) {
    return <CampusesSkeleton />;
  }

  if (error || !data?.snapshot) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No campus data available</p>
      </div>
    );
  }

  const allCampuses: CampusWithKey[] = Object.entries(data.snapshot.byCampus)
    .map(([key, campus]) => ({ key, ...campus }))
    .filter(campus =>
      campus.campusName.toLowerCase().includes(search.toLowerCase()) ||
      campus.mcLeader.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal as string);
        // When campusName is identical, fall back to mcLeader
        if (cmp === 0 && sortField === 'campusName') {
          return direction * a.mcLeader.localeCompare(b.mcLeader);
        }
        return direction * cmp;
      }
      return direction * ((aVal as number) - (bVal as number));
    })
    .filter(campus => {
      if (campusFilter === 'new') return campus.isNewCampus === true;
      if (campusFilter === 'returning') return campus.isNewCampus !== true;
      return true;
    });

  // Total campus count from unfiltered data (before search)
  const totalCampusCount = Object.keys(data.snapshot.byCampus).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campuses</h1>
        <p className="text-muted-foreground">
          {totalCampusCount} campuses &mdash; {selectedYear}
        </p>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campuses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Filter:
          {(['all', 'new', 'returning'] as CampusFilter[]).map(filter => (
            <Button
              key={filter}
              variant={campusFilter === filter ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCampusFilter(filter)}
              className="h-7 text-xs"
            >
              {filter === 'all' ? 'All' : filter === 'new' ? 'New' : 'Returning'}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort by:
          {(['campusName', 'totalEnrollment', 'retentionRate'] as SortField[]).map(field => (
            <Button
              key={field}
              variant={sortField === field ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort(field)}
              className="h-7 text-xs"
            >
              {field === 'campusName' ? 'Name' : field === 'totalEnrollment' ? 'Enrollment' : 'Retention'}
              {sortField === field && (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* All Campuses */}
      {allCampuses.length > 0 && (
        <CampusGroup
          title="All Campuses"
          icon={<Building2 className="h-5 w-5" />}
          campuses={allCampuses}
          isOpen={campusesOpen}
          onToggle={() => setCampusesOpen(!campusesOpen)}
          onCampusClick={(key) => navigate(`/dashboard/campus/${encodeURIComponent(key)}`)}
        />
      )}

      {allCampuses.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No campuses found matching your search
        </p>
      )}

    </div>
  );
}

interface CampusGroupProps {
  title: string;
  icon: React.ReactNode;
  campuses: CampusWithKey[];
  isOpen: boolean;
  onToggle: () => void;
  onCampusClick: (key: string) => void;
}

function CampusGroup({ title, icon, campuses, isOpen, onToggle, onCampusClick }: CampusGroupProps) {
  const totalEnrollment = campuses.reduce((sum, c) => sum + c.totalEnrollment, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 sm:gap-3 w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors">
          {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
          {icon}
          <span className="text-base sm:text-lg font-semibold">{title}</span>
          <Badge variant="secondary">{campuses.length}</Badge>
          <span className="text-xs sm:text-sm text-muted-foreground ml-auto hidden xs:inline">
            {formatNumber(totalEnrollment)} total
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-1 pt-1 pl-2 sm:pl-8">
          {campuses.map(campus => (
            <CampusCard
              key={campus.key}
              campus={campus}
              onClick={() => onCampusClick(campus.key)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}


function CampusCard({ campus, onClick }: { campus: CampusWithKey; onClick: () => void }) {
  const isMicroCampus = campus.campusName.toLowerCase().includes('micro-campus');
  const displayName = isMicroCampus ? (campus.mcLeader || 'Campus') : campus.campusName;
  const subtitle = isMicroCampus ? null : campus.mcLeader;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="px-3 py-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <CampusSizeBadge enrollment={campus.totalEnrollment} />
              {campus.isNewCampus && (
                <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15 text-xs">New</Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="grid grid-flow-col auto-cols-max gap-x-10.5 text-sm">
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs sm:text-sm">Currently Enrolled</p>
              <p className="font-semibold">{formatNumber(campus.totalEnrollment)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs sm:text-sm">Returning</p>
              <p className="font-semibold">{formatNumber(campus.returningStudents)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs sm:text-sm">New</p>
              <p className="font-semibold">{formatNumber(campus.newStudents)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs sm:text-sm">Retention</p>
              {campus.isNewCampus ? (
                <p className="font-semibold text-muted-foreground">N/A</p>
              ) : (
                <div className="flex items-center gap-1 justify-end">
                  <p className={`font-semibold ${getRetentionColor(campus.retentionRate)}`}>
                    {formatPercent(campus.retentionRate)}
                  </p>
                  {campus.eligiblePriorYear > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatNumber(campus.returningStudents)} of {formatNumber(campus.eligiblePriorYear)} prior year students returned
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampusSizeBadge({ enrollment }: { enrollment: number }) {
  if (enrollment >= 50) {
    return <Badge className="bg-chart-1/15 text-chart-1 border-chart-1/30 hover:bg-chart-1/15 text-xs">Large</Badge>;
  }
  if (enrollment >= 19) {
    return <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/30 hover:bg-chart-2/15 text-xs">Medium</Badge>;
  }
  return <Badge className="bg-chart-3/15 text-chart-3 border-chart-3/30 hover:bg-chart-3/15 text-xs">Small</Badge>;
}

function CampusesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96" />
    </div>
  );
}
