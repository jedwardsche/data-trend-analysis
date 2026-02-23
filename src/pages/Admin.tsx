import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, UserPlus, Trash2, Download, FileText, CheckCircle2, XCircle, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { triggerManualSync, updateSettings, manageAllowedUsers, exportPDF, exportCSV } from '@/lib/functions';
import { useOverviewData } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import type { AllowedUser } from '@/types';

interface OutletContext {
  selectedYear: string;
}

export function AdminPage() {
  const { selectedYear } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [erbocesInput, setErbocesInput] = useState('');
  const [fundingInputs, setFundingInputs] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch settings via overview data
  const { data: overviewData } = useOverviewData(selectedYear);
  const settings = overviewData?.settings;

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['allowedUsers'],
    queryFn: () => manageAllowedUsers({ action: 'list' })
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: triggerManualSync,
    onMutate: () => {
      setSyncStatus(null);
    },
    onSuccess: (data) => {
      const errCount = data.details?.errors?.length || 0;
      const processed = data.details?.processed || 0;
      const msg = errCount > 0
        ? `Sync completed: ${processed} records processed with ${errCount} error(s)`
        : `Sync completed successfully: ${processed} records processed`;
      setSyncStatus({ type: errCount > 0 ? 'error' : 'success', message: msg });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['snapshot'] });
    },
    onError: (error) => {
      setSyncStatus({ type: 'error', message: 'Sync failed: ' + (error as Error).message });
    }
  });

  // Settings mutation
  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success('Settings updated');
      setErbocesInput('');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + (error as Error).message);
    }
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: (data: { email: string; isAdmin: boolean }) =>
      manageAllowedUsers({ action: 'add', ...data }),
    onSuccess: () => {
      toast.success('User added');
      setNewUserEmail('');
      setNewUserIsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
    },
    onError: (error) => {
      toast.error('Failed to add user: ' + (error as Error).message);
    }
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: (email: string) =>
      manageAllowedUsers({ action: 'remove', email }),
    onSuccess: () => {
      toast.success('User removed');
      queryClient.invalidateQueries({ queryKey: ['allowedUsers'] });
    },
    onError: (error) => {
      toast.error('Failed to remove user: ' + (error as Error).message);
    }
  });

  // Export mutations
  const pdfMutation = useMutation({
    mutationFn: () => exportPDF({ schoolYear: selectedYear, reportType: 'annual' }),
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('PDF generated');
    },
    onError: (error) => {
      toast.error('PDF export failed: ' + (error as Error).message);
    }
  });

  const csvMutation = useMutation({
    mutationFn: (dataType: 'enrollment' | 'retention' | 'attendance' | 'timeline') =>
      exportCSV({ schoolYear: selectedYear, dataType }),
    onSuccess: (data, dataType) => {
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedYear}-${dataType}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    },
    onError: (error) => {
      toast.error('CSV export failed: ' + (error as Error).message);
    }
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserEmail) {
      addUserMutation.mutate({ email: newUserEmail, isAdmin: newUserIsAdmin });
    }
  };

  const handleUpdateErboces = () => {
    const value = parseFloat(erbocesInput);
    if (!isNaN(value) && value > 0) {
      settingsMutation.mutate({ erbocesPerStudentCost: value });
    }
  };

  const handleSaveFunding = (year: string) => {
    const raw = fundingInputs[year];
    if (!raw) return;
    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) return;

    const existingFunding = settings?.fundingByYear || {};
    const updatedFunding = { ...existingFunding, [year]: value };
    settingsMutation.mutate({ fundingByYear: updatedFunding });
    setFundingInputs(prev => ({ ...prev, [year]: '' }));
  };

  const users = usersData?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          Manage sync, settings, and users
        </p>
      </div>

      {/* Data Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sync</CardTitle>
          <CardDescription>
            Manually trigger a sync from Airtable to refresh all metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => syncMutation.mutate({})}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync All Years'}
            </Button>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate({ schoolYear: selectedYear })}
              disabled={syncMutation.isPending}
            >
              Sync {selectedYear} Only
            </Button>
          </div>
          {syncMutation.isPending && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm font-medium">Syncing data from Airtable... This may take a few minutes.</p>
            </div>
          )}
          {syncStatus && (
            <div className={`flex items-start justify-between gap-2 rounded-md border p-3 ${
              syncStatus.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}>
              <div className="flex items-start gap-2">
                {syncStatus.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                )}
                <p className="text-sm font-medium">{syncStatus.message}</p>
              </div>
              <button
                onClick={() => setSyncStatus(null)}
                className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ERBOCES Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Funding Settings</CardTitle>
          <CardDescription>
            Configure per-student cost for projections and record actual total funding per year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="erboces">Per-Student Cost ($)</Label>
              <Input
                id="erboces"
                type="number"
                placeholder="11380"
                value={erbocesInput}
                onChange={(e) => setErbocesInput(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={handleUpdateErboces}
              disabled={settingsMutation.isPending || !erbocesInput}
            >
              Update
            </Button>
          </div>

          {settings && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Total Funding by Year</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter actual total funding for past years. Current/future years use per-student cost × enrollment as a projection.
                  </p>
                </div>
                <div className="space-y-3">
                  {settings.activeSchoolYears.map(year => {
                    const savedAmount = settings.fundingByYear?.[year];
                    const isCurrent = year === settings.currentSchoolYear;
                    const yearIndex = settings.activeSchoolYears.indexOf(year);
                    const currentIndex = settings.activeSchoolYears.indexOf(settings.currentSchoolYear);
                    const isPastYear = yearIndex < currentIndex;

                    return (
                      <div key={year} className="flex items-center gap-4">
                        <div className="w-20 shrink-0">
                          <span className="text-sm font-medium">{year}</span>
                          {isCurrent && (
                            <Badge variant="outline" className="ml-1 text-[10px] py-0">Current</Badge>
                          )}
                        </div>
                        {isPastYear ? (
                          <>
                            <div className="flex gap-2 items-end flex-1">
                              <Input
                                type="number"
                                placeholder={savedAmount ? formatCurrency(savedAmount) : 'Enter total funding'}
                                value={fundingInputs[year] || ''}
                                onChange={(e) => setFundingInputs(prev => ({ ...prev, [year]: e.target.value }))}
                                className="w-48"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveFunding(year)}
                                disabled={settingsMutation.isPending || !fundingInputs[year]}
                              >
                                Save
                              </Button>
                            </div>
                            {savedAmount != null && !fundingInputs[year] && (
                              <span className="text-sm text-success font-medium">
                                {formatCurrency(savedAmount)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Projected from enrollment × per-student cost
                            {savedAmount != null && (
                              <span className="ml-2 text-foreground font-medium">
                                (Override: {formatCurrency(savedAmount)})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
          <CardDescription>
            Download reports and data for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={() => pdfMutation.mutate()}
              disabled={pdfMutation.isPending}
            >
              <FileText className="mr-2 h-4 w-4" />
              {pdfMutation.isPending ? 'Generating...' : 'Annual Report (PDF)'}
            </Button>
            <Button
              variant="outline"
              onClick={() => csvMutation.mutate('enrollment')}
              disabled={csvMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Enrollment (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={() => csvMutation.mutate('timeline')}
              disabled={csvMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              Timeline (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed Users</CardTitle>
          <CardDescription>
            Manage who can access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add User Form */}
          <form onSubmit={handleAddUser} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@che.school"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={newUserIsAdmin}
                onChange={(e) => setNewUserIsAdmin(e.target.checked)}
              />
              <Label htmlFor="isAdmin">Admin</Label>
            </div>
            <Button type="submit" disabled={addUserMutation.isPending || !newUserEmail}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </form>

          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users configured
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: AllowedUser) => (
                  <TableRow key={user.email}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge>Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Viewer</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.addedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUserMutation.mutate(user.email)}
                        disabled={removeUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
