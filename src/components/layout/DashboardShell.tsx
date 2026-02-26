import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  CalendarDays,
  Settings,
  LogOut,
  ChevronDown,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOverviewData } from '@/hooks/useDashboardData';
import cheLogo from '@/assets/che-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, adminOnly: false },
  { path: '/dashboard/campuses', label: 'Campuses', icon: Building2, adminOnly: false },
  { path: '/dashboard/yoy', label: 'Year over Year', icon: TrendingUp, adminOnly: false },
  { path: '/dashboard/timeline', label: 'Enrollment Timeline', icon: CalendarDays, adminOnly: false },
  { path: '/dashboard/admin', label: 'Admin', icon: Settings, adminOnly: true },
];

// Default school years - will be updated from settings
const schoolYears = ['2026-27', '2025-26', '2024-25', '2023-24'];

interface DashboardShellProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export function DashboardShell({ selectedYear, onYearChange }: DashboardShellProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: overviewData } = useOverviewData(selectedYear);
  const isAdmin = overviewData?.isAdmin ?? false;
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const userInitials = user?.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <img src={cheLogo} alt="CHE" className="h-8 w-auto shrink-0" />
            <span className="font-semibold text-lg hidden sm:inline">KPI Analytics</span>
          </div>

          <div className="flex-1" />

          {/* School Year Selector */}
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="School Year" />
            </SelectTrigger>
            <SelectContent>
              {schoolYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline max-w-[150px] truncate">
                  {user?.displayName || user?.email}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-transform md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex flex-col gap-1 p-4">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={cn(
          'flex-1 p-6 transition-all',
          sidebarOpen ? 'md:ml-64' : ''
        )}>
          <Outlet context={{ selectedYear, isAdmin }} />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
