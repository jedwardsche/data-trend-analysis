import { useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
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
import { formatCurrency, resolveFundingTotal } from '@/lib/formatters';
import { toast } from 'sonner';
import type { AllowedUser } from '@/types';

interface OutletContext {
  selectedYear: string;
  isAdmin: boolean;
}

export function AdminPage() {
  const { selectedYear, isAdmin } = useOutletContext<OutletContext>();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  const queryClient = useQueryClient();

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [fundingInputs, setFundingInputs] = useState<Record<string, { students: string; perStudentCost: string }>>({});
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      // Convert base64 to blob and trigger download
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
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

  const handleSaveFunding = (year: string) => {
    const input = fundingInputs[year];
    if (!input) return;
    const students = parseInt(input.students, 10);
    const perStudentCost = parseFloat(input.perStudentCost);
    if (isNaN(students) || students < 0 || isNaN(perStudentCost) || perStudentCost < 0) return;

    const existingFunding = settings?.fundingByYear || {};
    const updatedFunding = { ...existingFunding, [year]: { students, perStudentCost } };
    settingsMutation.mutate({ fundingByYear: updatedFunding });
    setFundingInputs(prev => ({ ...prev, [year]: { students: '', perStudentCost: '' } }));
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

      {/* Funding Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Funding Settings</CardTitle>
          <CardDescription>
            Enter the number of students and per-student cost for each year. Total funding is calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings && (
            <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Year</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Per-Student Cost</TableHead>
                      <TableHead className="text-right">Total Funding</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.activeSchoolYears.map(year => {
                      const saved = settings.fundingByYear?.[year];
                      const savedObj = saved != null && typeof saved === 'object' ? saved : null;
                      const savedTotal = resolveFundingTotal(saved);
                      const isCurrent = year === settings.currentSchoolYear;
                      const input = fundingInputs[year];
                      const hasInput = input?.students || input?.perStudentCost;

                      return (
                        <TableRow key={year}>
                          <TableCell className="font-medium">
                            {year}
                            {isCurrent && (
                              <Badge variant="outline" className="ml-1 text-[10px] py-0">Current</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder={savedObj ? String(savedObj.students) : '# students'}
                              value={input?.students || ''}
                              onChange={(e) => setFundingInputs(prev => ({
                                ...prev,
                                [year]: { ...prev[year], students: e.target.value, perStudentCost: prev[year]?.perStudentCost || '' }
                              }))}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              placeholder={savedObj ? String(savedObj.perStudentCost) : '$ per student'}
                              value={input?.perStudentCost || ''}
                              onChange={(e) => setFundingInputs(prev => ({
                                ...prev,
                                [year]: { ...prev[year], perStudentCost: e.target.value, students: prev[year]?.students || '' }
                              }))}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {savedTotal != null ? formatCurrency(savedTotal) : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleSaveFunding(year)}
                              disabled={settingsMutation.isPending || !hasInput}
                            >
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
            </div>
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
