import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { DashboardShell } from '@/components/layout/DashboardShell';

const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const CampusesPage = lazy(() => import('@/pages/Campuses').then(m => ({ default: m.CampusesPage })));
const YearOverYearPage = lazy(() => import('@/pages/YearOverYear').then(m => ({ default: m.YearOverYearPage })));
const TimelinePage = lazy(() => import('@/pages/Timeline').then(m => ({ default: m.TimelinePage })));
const AdminPage = lazy(() => import('@/pages/Admin').then(m => ({ default: m.AdminPage })));
const CampusDetailPage = lazy(() => import('@/pages/CampusDetail').then(m => ({ default: m.CampusDetailPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [selectedYear, setSelectedYear] = useState('2026-27');

  const fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardShell
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="campuses" element={<CampusesPage />} />
          <Route path="campus/:campusKey" element={<CampusDetailPage />} />
          <Route path="yoy" element={<YearOverYearPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
