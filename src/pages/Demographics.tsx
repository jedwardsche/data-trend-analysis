import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemographicsData, useOverviewData, useAllYearsDemographics } from '@/hooks/useDashboardData';
import { formatNumber } from '@/lib/formatters';
import { DemographicsPieChart } from '@/components/charts/DemographicsPieChart';
import { DemographicsBarChart } from '@/components/charts/DemographicsBarChart';
import { GradeLevelComparison } from '@/components/charts/GradeLevelComparison';
import { StudentHeatMap } from '@/components/maps/StudentHeatMap';
import { RadiusSearch } from '@/components/maps/RadiusSearch';
import type { ZipCodePoint, DemographicBreakdown, CityCount } from '@/types';

interface OutletContext {
  selectedYear: string;
}

export function DemographicsPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const { data, isLoading, error } = useDemographicsData(selectedYear);
  const { data: overviewData } = useOverviewData(selectedYear);

  // Get all active years for the grade level comparison
  const activeYears = useMemo(
    () => [...(overviewData?.settings.activeSchoolYears ?? [])].sort(),
    [overviewData?.settings.activeSchoolYears]
  );
  const allYearsDemoResults = useAllYearsDemographics(activeYears);

  // Build grade level data by year for comparison chart
  const gradeLevelByYear = useMemo(() => {
    const byYear: Record<string, DemographicBreakdown[]> = {};
    for (const result of allYearsDemoResults) {
      if (result.data?.data?.gradeLevel) {
        byYear[result.data.year] = result.data.data.gradeLevel;
      }
    }
    return byYear;
  }, [allYearsDemoResults]);

  // City search & sort state
  const [citySearch, setCitySearch] = useState('');
  const [citySort, setCitySort] = useState<{ field: 'city' | 'count'; dir: 'asc' | 'desc' }>({ field: 'count', dir: 'desc' });

  // Map state
  const [filteredPoints, setFilteredPoints] = useState<ZipCodePoint[] | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | undefined>(undefined);

  const mapPoints = useMemo(
    () => filteredPoints ?? data?.zipCodePoints ?? [],
    [filteredPoints, data?.zipCodePoints]
  );

  const filteredStudentCount = useMemo(
    () => mapPoints.reduce((sum, p) => sum + p.count, 0),
    [mapPoints]
  );

  if (isLoading) {
    return <DemographicsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {error ? 'Failed to load demographics data' : 'No data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Student Demographics</h1>
        <p className="text-muted-foreground">{selectedYear}</p>
      </div>

      {/* Total Students Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Student Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatNumber(data.totalStudents)}</p>
        </CardContent>
      </Card>

      {/* Grade Level Distribution (moved to top) */}
      {(data.gradeLevel?.length ?? 0) > 0 && (
        <DemographicsBarChart title="Grade Level Distribution" data={data.gradeLevel} sortByGradeOrder />
      )}

      {/* Grade Level Comparison by Year */}
      {activeYears.length >= 2 && Object.keys(gradeLevelByYear).length >= 2 && (
        <GradeLevelComparison dataByYear={gradeLevelByYear} years={activeYears.filter(y => (gradeLevelByYear[y]?.length ?? 0) > 0)} />
      )}

      {/* Geographic Distribution (moved to top) */}
      {(data.zipCodePoints?.length ?? 0) > 0 && (
        <Card className="overflow-hidden py-0 gap-0">
          <div className="grid lg:grid-cols-[220px_1fr] p-3 gap-3">
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Geographic Distribution</h3>
                <RadiusSearch
                  allPoints={data.zipCodePoints}
                  onFilteredPoints={setFilteredPoints}
                  onSearchCenter={setSearchCenter}
                  onSearchRadius={setSearchRadius}
                />
                {searchCenter && (
                  <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
                    <p className="text-2xl font-bold text-foreground">
                      {formatNumber(filteredStudentCount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Students in <strong>{mapPoints.length} zip codes</strong> within <strong>{searchRadius} miles</strong>
                    </p>
                  </div>
                )}
              </div>
              <StudentHeatMap
                points={mapPoints}
                searchCenter={searchCenter}
                searchRadius={searchRadius}
              />
          </div>
        </Card>
      )}

      {/* Students by City */}
      {(data.cityBreakdown?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students by City</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Search cities..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="mb-3"
            />
            {(() => {
              const filtered = citySearch
                ? data.cityBreakdown.filter((c: CityCount) =>
                    c.city.toLowerCase().includes(citySearch.toLowerCase())
                  )
                : data.cityBreakdown;
              const sorted = [...filtered].sort((a, b) => {
                if (citySort.field === 'city') {
                  return citySort.dir === 'asc'
                    ? a.city.localeCompare(b.city)
                    : b.city.localeCompare(a.city);
                }
                return citySort.dir === 'asc' ? a.count - b.count : b.count - a.count;
              });
              const toggleSort = (field: 'city' | 'count') => {
                setCitySort(prev =>
                  prev.field === field
                    ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                    : { field, dir: field === 'count' ? 'desc' : 'asc' }
                );
              };
              const sortIndicator = (field: 'city' | 'count') => {
                const isActive = citySort.field === field;
                const dir = isActive ? citySort.dir : (field === 'count' ? 'desc' : 'asc');
                const up = isActive ? '\u25B2' : '\u25B3';
                const down = isActive ? '\u25BC' : '\u25BD';
                return ' ' + (dir === 'asc' ? up : down);
              };
              return (
                <>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card">
                        <tr className="border-b">
                          <th className="w-8 text-left font-medium text-muted-foreground py-2">#</th>
                          <th
                            className="text-left font-medium text-muted-foreground py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => toggleSort('city')}
                          >
                            City{sortIndicator('city')}
                          </th>
                          <th
                            className="text-right font-medium text-muted-foreground py-2 cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => toggleSort('count')}
                          >
                            Students{sortIndicator('count')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((item: CityCount, index: number) => (
                          <tr key={item.city} className="border-b last:border-0">
                            <td className="w-8 py-2 text-muted-foreground">{index + 1}</td>
                            <td className="py-2">{item.city}</td>
                            <td className="py-2 text-right font-medium">{formatNumber(item.count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t mt-2 pt-3 flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">{sorted.length} cities</span>
                    <span>{formatNumber(sorted.reduce((sum: number, c: CityCount) => sum + c.count, 0))} students</span>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Primary Demographics: Ethnicity & Race */}
      <div className="grid gap-4 md:grid-cols-2">
        {(data.ethnicity?.length ?? 0) > 0 && <DemographicsPieChart title="Ethnicity" data={data.ethnicity} />}
        {(data.race?.length ?? 0) > 0 && <DemographicsPieChart title="Race" data={data.race} />}
      </div>

      {/* Gender & Language */}
      <div className="grid gap-4 md:grid-cols-2">
        {(data.gender?.length ?? 0) > 0 && <DemographicsPieChart title="Gender" data={data.gender} />}
        {(data.primaryLanguage?.length ?? 0) > 0 && <DemographicsPieChart title="Primary Language" data={data.primaryLanguage} />}
      </div>

      {/* Prior Educational Setting & Exit Destination */}
      {((selectedYear !== '2022-23' && (data.priorEducationalSetting?.length ?? 0) > 0) || (selectedYear !== '2026-27' && (data.exitDestination?.length ?? 0) > 0)) && (
        <div className="grid gap-4 md:grid-cols-2">
          {selectedYear !== '2022-23' && (data.priorEducationalSetting?.length ?? 0) > 0 && (
            <DemographicsPieChart title="Prior Educational Setting" data={data.priorEducationalSetting!} />
          )}
          {selectedYear !== '2026-27' && (data.exitDestination?.length ?? 0) > 0 && (
            <DemographicsPieChart title="Exit Destination" data={data.exitDestination!} />
          )}
        </div>
      )}

      {/* Additional Demographics */}
      {((data.isMilitary?.length ?? 0) > 0 || (data.isHomeless?.length ?? 0) > 0 || (data.isImmigrant?.length ?? 0) > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {(data.isMilitary?.length ?? 0) > 0 && (
            <DemographicsPieChart title="Military Connected" data={data.isMilitary!} />
          )}
          {(data.isHomeless?.length ?? 0) > 0 && (
            <DemographicsPieChart title="Homeless Status" data={data.isHomeless!} />
          )}
          {(data.isImmigrant?.length ?? 0) > 0 && (
            <DemographicsPieChart title="Immigrant Status" data={data.isImmigrant!} />
          )}
        </div>
      )}
    </div>
  );
}

function DemographicsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-32 mt-2" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-80" />
      <Skeleton className="h-[500px]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
