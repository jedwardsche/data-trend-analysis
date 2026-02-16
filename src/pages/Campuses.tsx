import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverviewData } from '@/hooks/useDashboardData';
import { formatNumber, formatPercent } from '@/lib/formatters';
import { Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OutletContext {
  selectedYear: string;
}

type SortField = 'campusName' | 'totalEnrollment' | 'returningStudents' | 'newStudents' | 'retentionRate';

export function CampusesPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useOverviewData(selectedYear);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalEnrollment');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const campuses = Object.entries(data.snapshot.byCampus)
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
        return direction * aVal.localeCompare(bVal as string);
      }
      return direction * ((aVal as number) - (bVal as number));
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campuses</h1>
        <p className="text-muted-foreground">
          Campus-level metrics for {selectedYear} (returning campuses only)
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Campuses</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campuses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="campusName">Campus</SortButton>
                </TableHead>
                <TableHead>MC Leader</TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalEnrollment">Enrolled</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="returningStudents">Returning</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="newStudents">New</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="retentionRate">Retention</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campuses.map(campus => (
                <TableRow
                  key={campus.key}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/dashboard/campus/${encodeURIComponent(campus.key)}`)}
                >
                  <TableCell className="font-medium">{campus.campusName}</TableCell>
                  <TableCell>{campus.mcLeader}</TableCell>
                  <TableCell className="text-right">{formatNumber(campus.totalEnrollment)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campus.returningStudents)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campus.newStudents)}</TableCell>
                  <TableCell className="text-right">
                    <span className={
                      campus.retentionRate >= 80 ? 'text-green-600' :
                      campus.retentionRate >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }>
                      {formatPercent(campus.retentionRate)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {campuses.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No campuses found matching your search
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CampusesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
